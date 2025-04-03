<?php

namespace LumaApi\Controllers;

use Core\Logger;
use Core\Database;
use Core\JWT;
use PDO;

class AdminController extends BaseController
{
    /**
     * Instance de la base de données
     * @var Database
     */
    private $database;
    
    /**
     * Utilisateur actuel (admin)
     * @var array|null
     */
    protected $currentUser;

    /**
     * Constructeur du contrôleur
     */
    public function __construct(Database $database)
    {
        $this->database = $database;
        
        // Vérifier si l'utilisateur est un administrateur
        $this->checkAdminAccess();
    }
    
    /**
     * Vérifie si l'utilisateur courant est un administrateur
     */
    private function checkAdminAccess()
    {
        // Récupérer le token depuis l'en-tête Authorization
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        $token = '';
        
        if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
            $token = $matches[1];
        }
        
        if (empty($token)) {
            $this->sendApiError(3001, 'Authentification requise', [
                'action' => 'login'
            ]);
            exit;
        }
        
        try {
            // Charger la configuration JWT
            $config = require ROOT_PATH . '/config/jwt.php';
            
            // Configurer la base de données pour JWT
            JWT::setDatabase($this->database);
            
            // Vérifier le token
            $payload = JWT::decode($token, $config['secret']);
            
            if (!$payload) {
                $this->sendApiError(3002, 'Token JWT invalide ou expiré', [
                    'action' => 'login'
                ]);
                exit;
            }
            
            // Vérifier si l'utilisateur est un administrateur
            $query = "SELECT * FROM luma_users WHERE id = :id AND role = 'admin' AND account_active = 1 LIMIT 1";
            $stmt = $this->database->getPdo()->prepare($query);
            $stmt->execute([':id' => $payload['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                $this->sendApiError(4001, 'Accès non autorisé', [
                    'message' => 'Vous n\'avez pas les droits administrateur nécessaires'
                ]);
                exit;
            }
            
            // Stocker l'utilisateur courant
            $this->currentUser = $user;
            
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la vérification des droits administrateur', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            $this->sendApiError(5001, 'Erreur d\'authentification', [
                'message' => $e->getMessage()
            ]);
            exit;
        }
    }
    
    /**
     * Liste tous les tokens actifs des utilisateurs
     * 
     * GET /admin/tokens
     * 
     * @return array Réponse JSON
     */
    public function listTokens()
    {
        try {
            $query = "SELECT 
                        t.id, t.user_id, t.jti, t.issued_at, t.expires_at, 
                        t.revoked, t.revoked_at, t.device_info, t.ip_address,
                        u.username, u.email, u.role
                      FROM luma_tokens t
                      JOIN luma_users u ON t.user_id = u.id
                      WHERE t.expires_at > NOW()
                      ORDER BY t.issued_at DESC";
            
            $tokens = $this->database->query($query);
            
            return [
                'success' => true,
                'data' => [
                    'tokens' => $tokens
                ]
            ];
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération des tokens', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération des tokens',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Liste les tokens actifs d'un utilisateur spécifique
     * 
     * GET /admin/users/{userId}/tokens
     * 
     * @param int $userId ID de l'utilisateur
     * @return array Réponse JSON
     */
    public function userTokens($userId)
    {
        try {
            // Vérifier si l'utilisateur existe
            $user = $this->database->find('luma_users', ['id' => $userId]);
            
            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                    'error' => 'L\'utilisateur demandé n\'existe pas'
                ];
            }
            
            $query = "SELECT 
                        t.id, t.jti, t.issued_at, t.expires_at, 
                        t.revoked, t.revoked_at, t.device_info, t.ip_address
                      FROM luma_tokens t
                      WHERE t.user_id = :user_id AND t.expires_at > NOW()
                      ORDER BY t.issued_at DESC";
            
            $tokens = $this->database->query($query, [':user_id' => $userId]);
            
            return [
                'success' => true,
                'data' => [
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'email' => $user['email'],
                        'role' => $user['role']
                    ],
                    'tokens' => $tokens
                ]
            ];
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération des tokens utilisateur', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $userId
            ]);
            
            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération des tokens utilisateur',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Révoque un token spécifique
     * 
     * POST /admin/tokens/{jti}/revoke
     * 
     * @param string $jti Identifiant unique du token
     * @return array Réponse JSON
     */
    public function revokeToken($jti)
    {
        try {
            // Vérifier si le token existe et n'est pas déjà révoqué
            $query = "SELECT * FROM luma_tokens WHERE jti = :jti LIMIT 1";
            $token = $this->database->query($query, [':jti' => $jti]);
            
            if (empty($token)) {
                return [
                    'success' => false,
                    'message' => 'Token introuvable',
                    'error' => 'Le token demandé n\'existe pas'
                ];
            }
            
            $token = $token[0];
            
            if ($token['revoked']) {
                return [
                    'success' => false,
                    'message' => 'Token déjà révoqué',
                    'error' => 'Ce token a déjà été révoqué'
                ];
            }
            
            // Configurer la base de données pour JWT
            JWT::setDatabase($this->database);
            
            // Révoquer le token
            $success = JWT::revokeToken($jti, $this->currentUser['id']);
            
            if (!$success) {
                return [
                    'success' => false,
                    'message' => 'Erreur lors de la révocation du token',
                    'error' => 'Une erreur est survenue lors de la révocation du token'
                ];
            }
            
            return [
                'success' => true,
                'message' => 'Token révoqué avec succès',
                'data' => [
                    'jti' => $jti,
                    'revoked_by' => $this->currentUser['username'],
                    'revoked_at' => date('Y-m-d H:i:s')
                ]
            ];
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la révocation du token', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'jti' => $jti
            ]);
            
            return [
                'success' => false,
                'message' => 'Erreur lors de la révocation du token',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Révoque tous les tokens d'un utilisateur
     * 
     * POST /admin/users/{userId}/revoke-tokens
     * 
     * @param int $userId ID de l'utilisateur
     * @return array Réponse JSON
     */
    public function revokeUserTokens($userId)
    {
        try {
            // Vérifier si l'utilisateur existe
            $user = $this->database->find('luma_users', ['id' => $userId]);
            
            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                    'error' => 'L\'utilisateur demandé n\'existe pas'
                ];
            }
            
            // Configurer la base de données pour JWT
            JWT::setDatabase($this->database);
            
            // Révoquer tous les tokens de l'utilisateur
            $success = JWT::revokeAllUserTokens($userId, $this->currentUser['id']);
            
            if (!$success) {
                return [
                    'success' => false,
                    'message' => 'Erreur lors de la révocation des tokens utilisateur',
                    'error' => 'Une erreur est survenue lors de la révocation des tokens'
                ];
            }
            
            return [
                'success' => true,
                'message' => 'Tous les tokens de l\'utilisateur ont été révoqués avec succès',
                'data' => [
                    'user_id' => $userId,
                    'username' => $user['username'],
                    'revoked_by' => $this->currentUser['username'],
                    'revoked_at' => date('Y-m-d H:i:s')
                ]
            ];
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la révocation des tokens utilisateur', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'user_id' => $userId
            ]);
            
            return [
                'success' => false,
                'message' => 'Erreur lors de la révocation des tokens utilisateur',
                'error' => $e->getMessage()
            ];
        }
    }
} 