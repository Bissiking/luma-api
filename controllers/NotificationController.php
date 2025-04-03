<?php

namespace LumaApi\Controllers;

use Core\Logger;
use Core\Database;
use Core\NotificationManager;
use Core\ActivityLogger;
use PDO;

/**
 * Contrôleur pour la gestion des notifications
 */
class NotificationController extends BaseController
{
    /**
     * Instance de la base de données
     * @var Database
     */
    private $database;
    
    /**
     * Utilisateur actuel
     * @var array|null
     */
    protected $currentUser;

    /**
     * Constructeur du contrôleur
     */
    public function __construct(Database $database)
    {
        $this->database = $database;
        
        // Configurer les gestionnaires
        NotificationManager::setDatabase($database);
        ActivityLogger::setDatabase($database);
        
        // Vérifier l'authentification de l'utilisateur
        $this->checkAuthentication();
    }
    
    /**
     * Vérifie si l'utilisateur est authentifié
     */
    private function checkAuthentication()
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
            
            // Vérifier le token
            $jwt = new \Core\JWT();
            $jwt::setDatabase($this->database);
            $payload = $jwt::decode($token, $config['secret']);
            
            if (!$payload) {
                $this->sendApiError(3002, 'Token JWT invalide ou expiré', [
                    'action' => 'login'
                ]);
                exit;
            }
            
            // Récupérer les informations de l'utilisateur
            $query = "SELECT * FROM luma_users WHERE id = :id AND account_active = 1 LIMIT 1";
            $stmt = $this->database->getPdo()->prepare($query);
            $stmt->execute([':id' => $payload['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                $this->sendApiError(3003, 'Utilisateur introuvable ou inactif', [
                    'action' => 'login'
                ]);
                exit;
            }
            
            // Stocker l'utilisateur courant
            $this->currentUser = $user;
            
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la vérification du token', [
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
     * Récupère les notifications actives pour l'utilisateur
     * 
     * GET /notifications
     * 
     * @return array Réponse JSON
     */
    public function getNotifications()
    {
        $module = $_GET['module'] ?? 'all';
        $includeDismissed = isset($_GET['include_dismissed']) && $_GET['include_dismissed'] === 'true';
        
        $notifications = NotificationManager::getActiveNotifications(
            $this->currentUser['role'],
            $module,
            $includeDismissed,
            $this->currentUser['id']
        );
        
        return [
            'success' => true,
            'data' => [
                'notifications' => $notifications
            ]
        ];
    }
    
    /**
     * Marque une notification comme ignorée pour l'utilisateur
     * 
     * POST /notifications/{id}/dismiss
     * 
     * @param int $id ID de la notification
     * @return array Réponse JSON
     */
    public function dismissNotification($id)
    {
        try {
            // Vérifier si la notification existe
            $query = "SELECT * FROM luma_notifications WHERE id = :id LIMIT 1";
            $stmt = $this->database->getPdo()->prepare($query);
            $stmt->execute([':id' => $id]);
            $notification = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$notification) {
                return [
                    'success' => false,
                    'message' => 'Notification introuvable',
                    'error' => 'La notification demandée n\'existe pas'
                ];
            }
            
            // Vérifier si la notification est déjà ignorée par l'utilisateur
            $checkQuery = "SELECT id FROM luma_dismissed_notifications 
                          WHERE user_id = :user_id AND notification_id = :notification_id LIMIT 1";
            $checkStmt = $this->database->getPdo()->prepare($checkQuery);
            $checkStmt->execute([
                ':user_id' => $this->currentUser['id'],
                ':notification_id' => $id
            ]);
            
            if ($checkStmt->fetch()) {
                return [
                    'success' => true,
                    'message' => 'Notification déjà ignorée'
                ];
            }
            
            // Marquer la notification comme ignorée
            $ip = $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
            
            $insertQuery = "INSERT INTO luma_dismissed_notifications 
                           (user_id, notification_id, device_info, ip_address) 
                           VALUES (:user_id, :notification_id, :device_info, :ip_address)";
            
            $insertStmt = $this->database->getPdo()->prepare($insertQuery);
            $insertStmt->execute([
                ':user_id' => $this->currentUser['id'],
                ':notification_id' => $id,
                ':device_info' => $userAgent,
                ':ip_address' => $ip
            ]);
            
            // Enregistrer l'action dans les logs d'activité
            ActivityLogger::log(
                $this->currentUser['id'],
                'other',
                "Notification ignorée: {$notification['title']}",
                [
                    'notification_id' => $id,
                    'notification_type' => $notification['type']
                ],
                'system',
                'success',
                'notification',
                (string)$id,
                null
            );
            
            return [
                'success' => true,
                'message' => 'Notification ignorée avec succès'
            ];
            
        } catch (\Exception $e) {
            Logger::error('Erreur lors de l\'ignorance de la notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'notification_id' => $id,
                'user_id' => $this->currentUser['id']
            ]);
            
            return [
                'success' => false,
                'message' => 'Erreur lors de l\'ignorance de la notification',
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Récupère une notification spécifique
     * 
     * GET /notifications/{id}
     * 
     * @param int $id ID de la notification
     * @return array Réponse JSON
     */
    public function getNotification($id)
    {
        try {
            $query = "SELECT * FROM luma_notifications WHERE id = :id LIMIT 1";
            $stmt = $this->database->getPdo()->prepare($query);
            $stmt->execute([':id' => $id]);
            $notification = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$notification) {
                return [
                    'success' => false,
                    'message' => 'Notification introuvable',
                    'error' => 'La notification demandée n\'existe pas'
                ];
            }
            
            // Vérifier si l'utilisateur a les droits pour voir cette notification
            $canView = strpos($notification['target_roles'], $this->currentUser['role']) !== false 
                    || $notification['target_roles'] === 'all';
                    
            if (!$canView) {
                return [
                    'success' => false,
                    'message' => 'Accès refusé',
                    'error' => 'Vous n\'avez pas les droits pour accéder à cette notification'
                ];
            }
            
            return [
                'success' => true,
                'data' => [
                    'notification' => $notification
                ]
            ];
            
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération de la notification', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'notification_id' => $id
            ]);
            
            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération de la notification',
                'error' => $e->getMessage()
            ];
        }
    }
} 