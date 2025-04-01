<?php

namespace App\Api\Controllers;

use App\Core\Logger;
use App\Core\TablePrefix;
use PDO;

class AuthController extends BaseController
{
    /**
     * Instance de PDO pour les requêtes à la base de données
     * @var PDO
     */
    protected $pdo;

    /**
     * Constructeur du contrôleur
     */
    public function __construct()
    {
        // Initialiser la connexion à la base de données
        $db = new \App\Core\Database();
        $this->pdo = $db->getPdo();
        
        // S'assurer que la session est démarrée
        if (session_status() === PHP_SESSION_NONE) {
            session_start([
                'cookie_secure' => isset($_SERVER['HTTPS']),
                'cookie_httponly' => true,
                'cookie_samesite' => 'Lax',
                'use_strict_mode' => true
            ]);
        }
    }
    
    /**
     * Vérifie si les données requises sont présentes
     * 
     * @param array $data Données à vérifier
     * @param array $required Champs requis
     * @param string $errorMessage Message d'erreur
     * @return bool
     */
    protected function validateRequiredFields($data, $required, $errorMessage)
    {
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                Logger::warning($errorMessage, [
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown',
                    'missing_field' => $field,
                    'data' => $data
                ]);
                
                $this->sendApiError(3002, $errorMessage, [
                    'missing_field' => $field,
                    'required_fields' => $required
                ]);
                return false;
            }
        }
        return true;
    }
    
    /**
     * Gère les logs et les erreurs liées à la base de données
     * 
     * @param \Exception $e Exception levée
     * @param string $context Contexte de l'erreur
     */
    protected function handleDatabaseError($e, $context)
    {
        if ($e instanceof \PDOException) {
            Logger::error("Erreur SQL lors de {$context}", [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'trace' => $e->getTraceAsString()
            ]);
        } else {
            Logger::error("Exception lors de {$context}", [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'trace' => $e->getTraceAsString()
            ]);
        }
        
        $this->sendApiError(4002, "Une erreur est survenue lors de {$context}", [
            'error' => $e->getMessage(),
            'context' => $context
        ]);
    }

    /**
     * Connecte un utilisateur et génère un token JWT
     * 
     * POST /api/auth/login
     * 
     * @return void
     */
    public function login()
    {
        $data = $this->getRequestData();
        
        // Valider les données requises
        if (empty($data['username']) || empty($data['password'])) {
            $this->sendErrorResponse('Le nom d\'utilisateur et le mot de passe sont requis', 400);
            return;
        }
        
        $username = $data['username'];
        $password = $data['password'];
        
        try {
            // Recherche de l'utilisateur dans la base de données
            $stmt = $this->pdo->prepare("
                SELECT id, username, email, password, role, status, last_login
                FROM users 
                WHERE (username = :username OR email = :username)
                AND status = 'active'
            ");
            
            $stmt->bindParam(':username', $username);
            $stmt->execute();
            
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            // Vérifier si l'utilisateur existe
            if (!$user) {
                $this->sendErrorResponse('Identifiants invalides', 401);
                return;
            }
            
            // Vérifier le mot de passe
            if (!password_verify($password, $user['password'])) {
                $this->sendErrorResponse('Identifiants invalides', 401);
                return;
            }
            
            // Mettre à jour la date de dernière connexion
            $updateStmt = $this->pdo->prepare("
                UPDATE users SET last_login = NOW() WHERE id = :id
            ");
            $updateStmt->bindParam(':id', $user['id']);
            $updateStmt->execute();
            
            // Supprimer le mot de passe de l'objet utilisateur
            unset($user['password']);
            
            // Générer un token JWT
            $token = $this->generateJwtToken($user);
            
            // Envoyer la réponse
            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Connexion réussie',
                'data' => [
                    'user' => $user,
                    'token' => $token
                ]
            ]);
        } catch (\Exception $e) {
            $this->sendErrorResponse('Erreur lors de la connexion', 500);
        }
    }
    
    /**
     * Inscrit un nouvel utilisateur
     * 
     * POST /api/auth/register
     * 
     * @return void
     */
    public function register()
    {
        $data = $this->getRequestData();
        
        // Valider les données requises
        if (empty($data['username']) || empty($data['email']) || empty($data['password'])) {
            $this->sendErrorResponse('Tous les champs sont requis', 400);
            return;
        }
        
        $username = $data['username'];
        $email = $data['email'];
        $password = $data['password'];
        
        // Validation supplémentaire
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->sendErrorResponse('Adresse email invalide', 400);
            return;
        }
        
        if (strlen($password) < 8) {
            $this->sendErrorResponse('Le mot de passe doit contenir au moins 8 caractères', 400);
            return;
        }
        
        try {
            // Vérifier si l'utilisateur ou l'email existe déjà
            $stmt = $this->pdo->prepare("
                SELECT COUNT(*) as count FROM users 
                WHERE username = :username OR email = :email
            ");
            
            $stmt->bindParam(':username', $username);
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            
            $result = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if ($result['count'] > 0) {
                $this->sendErrorResponse('Nom d\'utilisateur ou email déjà utilisé', 400);
                return;
            }
            
            // Hachage du mot de passe
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            
            // Insertion du nouvel utilisateur
            $insertStmt = $this->pdo->prepare("
                INSERT INTO users (username, email, password, role, status, created_at)
                VALUES (:username, :email, :password, 'user', 'active', NOW())
            ");
            
            $insertStmt->bindParam(':username', $username);
            $insertStmt->bindParam(':email', $email);
            $insertStmt->bindParam(':password', $hashedPassword);
            $insertStmt->execute();
            
            $userId = $this->pdo->lastInsertId();
            
            // Récupération des informations de l'utilisateur créé
            $getUserStmt = $this->pdo->prepare("
                SELECT id, username, email, role, status, created_at 
                FROM users 
                WHERE id = :id
            ");
            $getUserStmt->bindParam(':id', $userId);
            $getUserStmt->execute();
            $user = $getUserStmt->fetch(\PDO::FETCH_ASSOC);
            
            // Génération du token JWT
            $token = $this->generateJwtToken($user);
            
            // Envoi de la réponse
            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Inscription réussie',
                'data' => [
                    'user' => $user,
                    'token' => $token
                ]
            ], 201);
        } catch (\Exception $e) {
            $this->sendErrorResponse('Erreur lors de l\'inscription', 500);
        }
    }
    
    /**
     * Déconnecte l'utilisateur (invalidation du token)
     * 
     * POST /api/auth/logout
     * 
     * @return void
     */
    public function logout()
    {
        // Dans une implémentation réelle, nous ajouterions le token à une liste noire
        // Pour cette version simple, nous envoyons simplement une réponse réussie
        $this->sendJsonResponse([
            'success' => true,
            'message' => 'Déconnexion réussie'
        ]);
    }
    
    /**
     * Vérifie si un token est valide
     * 
     * GET /api/auth/check
     * 
     * @return void
     */
    public function check()
    {
        // Si nous arrivons ici, c'est que le token est valide (vérifié par le middleware)
        $this->sendJsonResponse([
            'success' => true,
            'message' => 'Token valide',
            'data' => [
                'user' => $this->currentUser
            ]
        ]);
    }
    
    /**
     * Demande de réinitialisation de mot de passe
     * 
     * POST /api/auth/forgot-password
     * 
     * @return void
     */
    public function forgotPassword()
    {
        $data = $this->getRequestData();
        
        if (empty($data['email'])) {
            $this->sendErrorResponse('L\'adresse email est requise', 400);
            return;
        }
        
        $email = $data['email'];
        
        try {
            // Vérifier si l'email existe
            $stmt = $this->pdo->prepare("
                SELECT id, username FROM users 
                WHERE email = :email AND status = 'active'
            ");
            
            $stmt->bindParam(':email', $email);
            $stmt->execute();
            
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$user) {
                // Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
                $this->sendJsonResponse([
                    'success' => true,
                    'message' => 'Si cette adresse email est associée à un compte, un lien de réinitialisation sera envoyé.'
                ]);
                return;
            }
            
            // Générer un token de réinitialisation
            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));
            
            // Enregistrer le token dans la base de données
            $resetStmt = $this->pdo->prepare("
                INSERT INTO password_resets (user_id, token, expires_at, created_at)
                VALUES (:user_id, :token, :expires_at, NOW())
            ");
            
            $resetStmt->bindParam(':user_id', $user['id']);
            $resetStmt->bindParam(':token', $token);
            $resetStmt->bindParam(':expires_at', $expiresAt);
            $resetStmt->execute();
            
            // Envoyer l'email avec le lien de réinitialisation
            // (Dans une implémentation réelle, vous utiliseriez une bibliothèque d'envoi d'emails)
            $resetUrl = $this->config['frontend_url'] . '/reset-password?token=' . $token;
            
            // Simulation d'envoi d'email (code à remplacer)
            $mailSent = true;
            
            if ($mailSent) {
                $this->sendJsonResponse([
                    'success' => true,
                    'message' => 'Si cette adresse email est associée à un compte, un lien de réinitialisation sera envoyé.'
                ]);
            } else {
                $this->sendErrorResponse('Erreur lors de l\'envoi de l\'email', 500);
            }
        } catch (\Exception $e) {
            $this->sendErrorResponse('Erreur lors de la demande de réinitialisation', 500);
        }
    }
    
    /**
     * Réinitialise le mot de passe avec un token valide
     * 
     * POST /api/auth/reset-password
     * 
     * @return void
     */
    public function resetPassword()
    {
        $data = $this->getRequestData();
        
        if (empty($data['token']) || empty($data['password'])) {
            $this->sendErrorResponse('Le token et le nouveau mot de passe sont requis', 400);
            return;
        }
        
        $token = $data['token'];
        $password = $data['password'];
        
        // Validation du mot de passe
        if (strlen($password) < 8) {
            $this->sendErrorResponse('Le mot de passe doit contenir au moins 8 caractères', 400);
            return;
        }
        
        try {
            // Vérifier si le token est valide et non expiré
            $stmt = $this->pdo->prepare("
                SELECT pr.user_id, u.username 
                FROM password_resets pr
                JOIN users u ON pr.user_id = u.id
                WHERE pr.token = :token 
                AND pr.expires_at > NOW() 
                AND pr.used = 0
            ");
            
            $stmt->bindParam(':token', $token);
            $stmt->execute();
            
            $reset = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$reset) {
                $this->sendErrorResponse('Token invalide ou expiré', 400);
                return;
            }
            
            // Hachage du nouveau mot de passe
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            
            // Mise à jour du mot de passe
            $updateStmt = $this->pdo->prepare("
                UPDATE users SET password = :password 
                WHERE id = :user_id
            ");
            
            $updateStmt->bindParam(':password', $hashedPassword);
            $updateStmt->bindParam(':user_id', $reset['user_id']);
            $updateStmt->execute();
            
            // Marquer le token comme utilisé
            $markStmt = $this->pdo->prepare("
                UPDATE password_resets SET used = 1 
                WHERE token = :token
            ");
            
            $markStmt->bindParam(':token', $token);
            $markStmt->execute();
            
            $this->sendJsonResponse([
                'success' => true,
                'message' => 'Mot de passe réinitialisé avec succès'
            ]);
        } catch (\Exception $e) {
            $this->sendErrorResponse('Erreur lors de la réinitialisation du mot de passe', 500);
        }
    }
    
    /**
     * Génère un token JWT
     * 
     * @param array $user Données de l'utilisateur
     * @return string Token JWT
     */
    private function generateJwtToken($user)
    {
        $issuedAt = time();
        $expirationTime = $issuedAt + (60 * 60 * 24); // 24 heures
        
        $payload = [
            'iat' => $issuedAt,
            'exp' => $expirationTime,
            'sub' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        
        // Dans une implémentation réelle, vous utiliseriez une bibliothèque JWT
        // Pour cette version simple, nous encodons un token factice
        return base64_encode(json_encode($payload)) . '.' . md5(json_encode($payload) . $this->config['jwt_secret']);
    }
} 