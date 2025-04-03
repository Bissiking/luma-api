<?php

namespace LumaApi\Controllers;

use Core\Logger;
use Core\Database;
use Core\JWT;
use PDO;

/**
 * Contrôleur pour la gestion de l'authentification
 */
class AuthController extends BaseController
{
    /**
     * Instance de PDO pour les requêtes à la base de données
     * @var PDO
     */
    protected $pdo;

    /**
     * @var Database Instance de la base de données
     */
    private $database;

    /**
     * @var JWT Instance de la gestion des tokens JWT
     */
    private $jwt;

    /**
     * Constructeur du contrôleur
     */
    public function __construct()
    {
        parent::__construct();
        
        // Charger la configuration de la base de données
        $config = require ROOT_PATH . '/config/database.php';
        $this->database = new Database($config);
        $this->jwt = new JWT();
        
        // Définir la constante ROOT_PATH si elle n'existe pas
        if (!defined('ROOT_PATH')) {
            define('ROOT_PATH', dirname(__DIR__));
        }

        // Initialiser la connexion à la base de données
        $this->pdo = $this->database->getPdo();

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
     * Récupère les données de la requête en fonction du Content-Type
     * 
     * @return array Données de la requête
     */
    protected function getRequestData(): array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (strpos($contentType, 'application/json') !== false) {
            return json_decode(file_get_contents('php://input'), true) ?? [];
        }

        if (strpos($contentType, 'application/x-www-form-urlencoded') !== false) {
            return $_POST;
        }

        if (strpos($contentType, 'multipart/form-data') !== false) {
            return $_POST;
        }

        // Par défaut, on essaie de parser comme JSON
        return json_decode(file_get_contents('php://input'), true) ?? [];
    }

    /**
     * Connecte un utilisateur et génère un token JWT
     * 
     * POST /auth/login
     * 
     * @return array Réponse JSON
     */
    public function login()
    {
        // Récupération des données de la requête
        $data = $this->getRequestData();
        
        // Vérification des données requises
        if (empty($data['username']) || empty($data['password'])) {
            return [
                'success' => false,
                'message' => 'Identifiants manquants',
                'error' => 'Le nom d\'utilisateur et le mot de passe sont requis'
            ];
        }
        
        try {
            // Recherche de l'utilisateur dans la base de données
            $query = "SELECT * FROM luma_users WHERE username = :username AND account_active = 1";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute([':username' => $data['username']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Identifiants incorrects',
                    'error' => 'Nom d\'utilisateur ou mot de passe invalide'
                ];
            }
            
            // Vérification du mot de passe
            if (!password_verify($data['password'], $user['password'])) {
                return [
                    'success' => false,
                    'message' => 'Identifiants incorrects',
                    'error' => 'Nom d\'utilisateur ou mot de passe invalide'
                ];
            }
            
            // Mise à jour de la date de dernière connexion
            $updateStmt = $this->pdo->prepare("UPDATE luma_users SET last_login = NOW() WHERE id = :id");
            $updateStmt->execute([':id' => $user['id']]);
            
            // Suppression du mot de passe de l'objet utilisateur
            unset($user['password']);
            
            // Génération du token JWT
            $token = $this->generateToken($user);
            
            return [
                'success' => true,
                'message' => 'Connexion réussie',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'email' => $user['email'],
                        'name' => $user['name'] ?? '',
                        'role' => $user['role']
                    ]
                ]
            ];
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la connexion', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'message' => 'Erreur lors de la connexion',
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Génère un token JWT pour l'utilisateur
     * 
     * @param array $user Données de l'utilisateur
     * @return string Token JWT
     */
    private function generateToken($user)
    {
        try {
            // Charger la configuration des clés JWT
            $jwtConfig = require ROOT_PATH . '/config/jwt.php';
            
            // Créer le payload avec les informations de l'utilisateur
            $payload = [
                'sub' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role'],
                'jti' => bin2hex(random_bytes(16)), // Identifiant unique du token
                'iat' => time(),
                'exp' => time() + (24 * 60 * 60) // Expiration dans 24 heures
            ];
            
            // Générer le token avec la clé privée
            return $this->jwt->encode($payload, $jwtConfig['private_key'], $jwtConfig['algorithm']);
            
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la génération du token: ' . $e->getMessage());
            throw $e;
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
            $token = $this->generateToken($user);

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
     * POST /auth/logout
     * 
     * @return array Réponse JSON
     */
    public function logout()
    {
        // Dans une implémentation plus avancée, on stockerait le token dans une liste noire
        // Pour cette version simple, on indique simplement que la déconnexion est réussie
        return [
            'success' => true,
            'message' => 'Déconnexion réussie'
        ];
    }

    /**
     * Vérifie si un token est valide
     * 
     * GET /auth/check
     * 
     * @return array Réponse JSON
     */
    public function check()
    {
        // Récupération du token depuis l'en-tête Authorization
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token = '';
        
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
        }
        
        if (empty($token)) {
            return [
                'success' => false,
                'message' => 'Token manquant',
                'error' => 'Vous devez fournir un token d\'authentification'
            ];
        }
        
        try {
            // Chargement de la configuration
            $config = require ROOT_PATH . '/config/jwt.php';
            
            // Décodage du token
            $payload = JWT::decode($token, $config['secret']);
            
            if (!$payload) {
                return [
                    'success' => false,
                    'message' => 'Token invalide',
                    'error' => 'Le token fourni est invalide ou a expiré'
                ];
            }
            
            // Récupération des informations de l'utilisateur
            $query = "SELECT id, username, email, name, role FROM luma_users WHERE id = :id AND account_active = 1";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute([':id' => $payload['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                    'error' => 'L\'utilisateur associé au token n\'existe pas ou a été désactivé'
                ];
            }
            
            return [
                'success' => true,
                'message' => 'Token valide',
                'data' => [
                    'user' => $user
                ]
            ];
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la vérification du token', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'message' => 'Erreur lors de la vérification du token',
                'error' => $e->getMessage()
            ];
        }
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
}
