<?php

namespace LumaApi\Controllers;

use Core\Database;
use Core\Logger;
use Core\ApiErrors;

/**
 * Contrôleur de base pour l'API
 */
class BaseController {
    /**
     * @var array Configuration de l'application
     */
    protected $config;
    
    /**
     * @var object Instance de connexion à la base de données
     */
    protected $db;
    
    /**
     * @var array Données de l'utilisateur authentifié
     */
    protected $currentUser;
    
    /**
     * Constructeur du contrôleur
     */
    public function __construct()
    {
        // Charger la configuration
        $this->config = require dirname(__DIR__) . '/config/app.php';
        
        // Initialiser la connexion à la base de données
        $dbConfig = require dirname(dirname(__DIR__)) . '/core/config/database.php';
        $this->db = new Database($dbConfig);
        
        // Vérifier l'authentification uniquement si la méthode requiresAuth() est appelée
        if (method_exists($this, 'requiresAuth') && $this->requiresAuth()) {
            if (!$this->isAuthenticated()) {
                $this->sendUnauthorizedResponse();
                exit;
            }
        }
    }
    
    /**
     * Détermine si la route actuelle nécessite une authentification
     * 
     * @return bool
     */
    protected function requiresAuth()
    {
        // Par défaut, toutes les routes API nécessitent une authentification
        // sauf celles définies dans $publicRoutes
        $publicRoutes = [
            '/api/auth/login',
            '/api/auth/register',
            '/api/auth/forgot-password',
            '/api/auth/reset-password',
            '/api/health',
            '/api/version'
        ];
        
        $currentRoute = $_SERVER['REQUEST_URI'];
        
        foreach ($publicRoutes as $route) {
            if (strpos($currentRoute, $route) === 0) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Vérifie si l'utilisateur est authentifié
     * 
     * @return bool
     */
    protected function isAuthenticated()
    {
        return $this->currentUser !== null;
    }
    
    /**
     * Récupère l'utilisateur courant à partir du token d'authentification
     * 
     * @return array|null
     */
    protected function getCurrentUser()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? null;
        
        if (!$authHeader || !preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
            return null;
        }
        
        $token = $matches[1];
        
        // Vérification du token et récupération des infos utilisateur
        try {
            // À implémenter avec la validation JWT ou autre
            // Pour l'instant, simulation simple
            if ($token === 'invalid_token') {
                return null;
            }
            
            // Récupération de l'utilisateur depuis la base de données
            // Simulé pour l'exemple
            return [
                'id' => 1,
                'username' => 'admin',
                'email' => 'admin@example.com',
                'role' => 'admin'
            ];
        } catch (\Exception $e) {
            return null;
        }
    }
    
    /**
     * Envoie une réponse JSON
     * 
     * @param mixed $data Les données à envoyer
     * @param int $statusCode Code HTTP de la réponse
     * @return void
     */
    protected function sendJsonResponse($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json');
        echo json_encode($data);
        exit;
    }
    
    /**
     * Envoie une réponse d'erreur
     * 
     * @param string $message Message d'erreur
     * @param int $statusCode Code HTTP de l'erreur
     * @return void
     */
    protected function sendErrorResponse($message, $statusCode = 400)
    {
        $this->sendJsonResponse([
            'success' => false,
            'error' => $message
        ], $statusCode);
    }
    
    /**
     * Envoie une réponse non autorisée
     * 
     * @return void
     */
    protected function sendUnauthorizedResponse()
    {
        $this->sendErrorResponse('Accès non autorisé. Authentification requise.', 401);
    }
    
    /**
     * Envoie une réponse interdite
     * 
     * @return void
     */
    protected function sendForbiddenResponse()
    {
        $this->sendErrorResponse('Accès interdit. Vous n\'avez pas les droits nécessaires.', 403);
    }
    
    /**
     * Récupère les données de la requête POST
     * 
     * @return array
     */
    protected function getRequestData()
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        
        if (strpos($contentType, 'application/json') !== false) {
            // Traitement des données JSON
            $json = file_get_contents('php://input');
            return json_decode($json, true) ?? [];
        } else {
            // Traitement des données de formulaire
            return $_POST;
        }
    }

    protected function sendApiError(int $code, string $message, array $details = []): void
    {
        header('Content-Type: application/json');
        http_response_code($code >= 400 ? $code : 400);
        echo json_encode([
            'success' => false,
            'error_code' => $code,
            'message' => $message,
            'details' => $details
        ]);
        exit;
    }
} 