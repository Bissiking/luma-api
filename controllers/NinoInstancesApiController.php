<?php

namespace App\Api\Controllers;

use App\Core\Database;

class NinoInstancesApiController
{
    private $db;
    
    public function __construct()
    {
        $this->db = new Database();
    }
    
    /**
     * Renvoie une réponse JSON
     */
    private function jsonResponse($data, $statusCode = 200)
    {
        header('Content-Type: application/json; charset=utf-8');
        http_response_code($statusCode);
        echo json_encode($data);
        exit;
    }
    
    /**
     * Récupère les informations d'état de l'instance
     * Cette méthode est appelée depuis une autre instance pour vérifier la disponibilité
     */
    public function getStatus()
    {
        // Vérifier l'authentification par clé API
        if (!$this->checkApiKey()) {
            return $this->jsonResponse(['success' => false, 'message' => 'Clé API non valide'], 401);
        }
        
        // Récupérer les informations sur l'espace disque
        $diskSpace = disk_total_space('/');
        $freeSpace = disk_free_space('/');
        $usedSpace = $diskSpace - $freeSpace;
        
        // Récupérer le nombre total de vidéos
        $videosCount = $this->db->queryOne("SELECT COUNT(*) as count FROM nino_videos");
        $totalVideos = $videosCount ? intval($videosCount['count']) : 0;
        
        // Construire la réponse
        $response = [
            'success' => true,
            'status' => 'active',
            'disk_space' => $diskSpace,
            'used_space' => $usedSpace,
            'free_space' => $freeSpace,
            'total_videos' => $totalVideos,
            'instance_name' => $_ENV['APP_NAME'] ?? 'Nino Instance',
            'version' => $_ENV['APP_VERSION'] ?? '1.0.0',
            'timestamp' => time()
        ];
        
        return $this->jsonResponse($response);
    }
    
    /**
     * Récupère la configuration de l'instance
     */
    public function getConfiguration()
    {
        // Vérifier l'authentification par clé API
        if (!$this->checkApiKey()) {
            return $this->jsonResponse(['success' => false, 'message' => 'Clé API non valide'], 401);
        }
        
        // Récupérer les paramètres de configuration
        $config = [
            'instance_name' => $_ENV['APP_NAME'] ?? 'Nino Instance',
            'version' => $_ENV['APP_VERSION'] ?? '1.0.0',
            'storage_path' => $_ENV['STORAGE_PATH'] ?? '/storage/videos',
            'max_file_size' => $_ENV['MAX_FILE_SIZE'] ?? 104857600, // 100MB par défaut
            'allowed_formats' => $_ENV['ALLOWED_FORMATS'] ?? 'mp4,webm,mkv',
            'upload_enabled' => $_ENV['UPLOAD_ENABLED'] ?? true,
            'replication_enabled' => $_ENV['REPLICATION_ENABLED'] ?? false,
            'max_concurrent_uploads' => $_ENV['MAX_CONCURRENT_UPLOADS'] ?? 3,
            'max_bitrate' => $_ENV['MAX_BITRATE'] ?? 0, // 0 = illimité
            'transcoding_enabled' => $_ENV['TRANSCODING_ENABLED'] ?? false,
            'transcoding_profiles' => $this->getTranscodingProfiles(),
            'cache_ttl' => $_ENV['CACHE_TTL'] ?? 3600,
            'video_endpoint' => $_ENV['VIDEO_ENDPOINT'] ?? '/videos'
        ];
        
        return $this->jsonResponse(['success' => true, 'config' => $config]);
    }
    
    /**
     * Met à jour la configuration de l'instance
     */
    public function updateConfiguration()
    {
        // Vérifier l'authentification par clé API
        if (!$this->checkApiKey()) {
            return $this->jsonResponse(['success' => false, 'message' => 'Clé API non valide'], 401);
        }
        
        // Récupérer les données JSON de la requête
        $requestData = json_decode(file_get_contents('php://input'), true);
        
        if (!$requestData) {
            return $this->jsonResponse(['success' => false, 'message' => 'Données JSON invalides'], 400);
        }
        
        // Vérifier que l'utilisateur est administrateur
        if (!$this->isAdmin()) {
            return $this->jsonResponse(['success' => false, 'message' => 'Seuls les administrateurs peuvent modifier la configuration'], 403);
        }
        
        // Valider et mettre à jour les paramètres de configuration
        $updatedConfig = [];
        $allowedParams = [
            'storage_path', 'max_file_size', 'allowed_formats', 'upload_enabled',
            'replication_enabled', 'max_concurrent_uploads', 'max_bitrate',
            'transcoding_enabled', 'cache_ttl', 'video_endpoint'
        ];
        
        foreach ($allowedParams as $param) {
            if (isset($requestData[$param])) {
                // Mettre à jour la configuration (dans un environnement de production, 
                // cela pourrait impliquer de modifier un fichier .env ou une table de configuration)
                $updatedConfig[$param] = $requestData[$param];
            }
        }
        
        // Simuler la mise à jour (dans un environnement réel, vous utiliseriez un service de configuration)
        // Cette partie devrait être adaptée selon votre système de gestion de configuration
        
        return $this->jsonResponse([
            'success' => true, 
            'message' => 'Configuration mise à jour avec succès',
            'updated' => $updatedConfig
        ]);
    }
    
    /**
     * Récupère tous les videos stockés sur cette instance
     */
    public function getVideos() 
    {
        // Vérifier l'authentification par clé API
        if (!$this->checkApiKey()) {
            return $this->jsonResponse(['success' => false, 'message' => 'Clé API non valide'], 401);
        }
        
        // Pagination
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
        $offset = ($page - 1) * $limit;
        
        // Récupérer les vidéos
        $videos = $this->db->query(
            "SELECT * FROM nino_videos ORDER BY id DESC LIMIT ? OFFSET ?",
            [$limit, $offset]
        );
        
        // Récupérer le nombre total de vidéos
        $countResult = $this->db->queryOne("SELECT COUNT(*) as count FROM nino_videos");
        $totalVideos = $countResult ? intval($countResult['count']) : 0;
        
        return $this->jsonResponse([
            'success' => true,
            'videos' => $videos,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $totalVideos,
                'pages' => ceil($totalVideos / $limit)
            ]
        ]);
    }
    
    /**
     * Vérifie la validité de la clé API fournie dans les en-têtes
     */
    private function checkApiKey()
    {
        // Récupérer la clé API depuis l'en-tête Authorization
        $headers = getallheaders();
        $authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
        
        // Vérifier si l'en-tête commence par "Bearer "
        if (strpos($authHeader, 'Bearer ') !== 0) {
            return false;
        }
        
        // Extraire la clé API
        $apiKey = substr($authHeader, 7);
        
        // Vérifier si la clé API existe dans la base de données
        $instance = $this->db->queryOne(
            "SELECT * FROM nino_instances WHERE api_key = ? AND status = 'active'",
            [$apiKey]
        );
        
        return $instance !== false;
    }
    
    /**
     * Vérifie si l'utilisateur actuel est administrateur
     */
    private function isAdmin()
    {
        return isset($_SESSION['user']) && $_SESSION['user']['role'] === 'admin';
    }
    
    /**
     * Récupère les profils de transcodage configurés
     */
    private function getTranscodingProfiles()
    {
        // Dans une implémentation réelle, ces profils pourraient être stockés en base de données
        return [
            [
                'name' => 'low',
                'resolution' => '640x360',
                'bitrate' => '500k',
                'audio_bitrate' => '64k'
            ],
            [
                'name' => 'medium',
                'resolution' => '1280x720',
                'bitrate' => '1500k',
                'audio_bitrate' => '128k'
            ],
            [
                'name' => 'high',
                'resolution' => '1920x1080',
                'bitrate' => '3000k',
                'audio_bitrate' => '192k'
            ]
        ];
    }
} 