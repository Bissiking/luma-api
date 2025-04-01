<?php

namespace App\Api\Controllers;

use App\Core\Logger;
Logger::debug('Chargement du contrôleur MonitoringController');

class MonitoringController extends BaseController
{
    /**
     * Récupère tous les agents de monitoring
     * 
     * @return void
     */
    public function getAllAgents()
    {
        try {
            // Debug: Journaliser l'accès à la méthode
            Logger::debug('Début de récupération des agents via API', [
                'session' => session_status() === PHP_SESSION_ACTIVE ? 'active' : 'inactive',
                'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
            ]);
            
            // Démarrer la session si elle n'est pas active
            if (session_status() === PHP_SESSION_NONE) {
                session_start([
                    'cookie_secure' => isset($_SERVER['HTTPS']),
                    'cookie_httponly' => true,
                    'cookie_samesite' => 'Lax'
                ]);
            }
            
            // Récupérer les données utilisateur depuis différentes structures possibles
            $userId = isset($_SESSION['user']['id']) ? $_SESSION['user']['id'] : (isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null);
            $userRole = isset($_SESSION['user']['role']) ? $_SESSION['user']['role'] : (isset($_SESSION['user_role']) ? $_SESSION['user_role'] : 'guest');
            
            // Vérifier si l'utilisateur est admin
            $isAdmin = $userRole === 'admin';
            
            // Pour les utilisateurs non connectés, récupérer uniquement les agents publics
            $isAuthenticated = $userId !== null;
            
            // Debug: Journaliser les données utilisateur
            Logger::debug('Données utilisateur pour getAllAgents', [
                'user_id' => $userId ?? 'non connecté',
                'user_role' => $userRole,
                'is_admin' => $isAdmin ? 'oui' : 'non',
                'is_authenticated' => $isAuthenticated ? 'oui' : 'non'
            ]);
            
            $query = "SELECT a.*, 
                      CASE 
                        WHEN a.last_check_in IS NULL THEN 'never' 
                        WHEN (SELECT MAX(created_at) FROM monitoring_metrics WHERE agent_id = a.id) > DATE_SUB(NOW(), INTERVAL 5 MINUTE) THEN 'active' 
                        WHEN a.last_check_in > DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 'idle' 
                        ELSE 'inactive' 
                      END as real_status 
                      FROM monitoring_agents a";
            
            // Debug: Journaliser la requête SQL de base
            Logger::debug('Requête SQL de base pour getAllAgents', [
                'query' => $query
            ]);
            
            // Pour les utilisateurs authentifiés qui ne sont pas admin, filtrer par user_id
            if ($isAuthenticated && !$isAdmin && $userId) {
                $query .= " WHERE a.user_id = :user_id";
                Logger::debug('Exécution requête SQL filtrée par utilisateur', [
                    'user_id' => $userId,
                    'final_query' => $query
                ]);
                try {
                    $agents = $this->db->query($query, ['user_id' => $userId]);
                } catch (\Exception $dbEx) {
                    Logger::error('Erreur SQL lors de la requête filtrée par utilisateur', [
                        'error' => $dbEx->getMessage(),
                        'query' => $query,
                        'user_id' => $userId
                    ]);
                    return $this->sendApiError(4002, 'Erreur lors de la requête SQL des agents', [
                        'sql_error' => $dbEx->getMessage(),
                        'method' => 'getAllAgents:user_filter'
                    ]);
                }
            } 
            // Pour les utilisateurs non authentifiés, montrer seulement les agents publics
            elseif (!$isAuthenticated) {
                $query .= " WHERE a.is_public = 1";
                Logger::debug('Exécution requête SQL filtrée pour agents publics', [
                    'final_query' => $query
                ]);
                try {
                    $agents = $this->db->query($query);
                } catch (\Exception $dbEx) {
                    Logger::error('Erreur SQL lors de la requête pour agents publics', [
                        'error' => $dbEx->getMessage(),
                        'query' => $query
                    ]);
                    return $this->sendApiError(4002, 'Erreur lors de la requête SQL des agents', [
                        'sql_error' => $dbEx->getMessage(),
                        'method' => 'getAllAgents:public'
                    ]);
                }
            }
            // Pour les admins, afficher tous les agents
            else {
                Logger::debug('Exécution requête SQL pour tous les agents', [
                    'is_admin' => $isAdmin,
                    'final_query' => $query
                ]);
                try {
                    $agents = $this->db->query($query);
                } catch (\Exception $dbEx) {
                    Logger::error('Erreur SQL lors de la requête pour tous les agents', [
                        'error' => $dbEx->getMessage(),
                        'query' => $query
                    ]);
                    return $this->sendApiError(4002, 'Erreur lors de la requête SQL des agents', [
                        'sql_error' => $dbEx->getMessage(),
                        'method' => 'getAllAgents:all'
                    ]);
                }
            }
            
            // Debug: Journaliser le nombre d'agents récupérés
            Logger::debug('Agents récupérés avec succès', [
                'count' => count($agents),
                'is_admin' => $isAdmin,
                'is_authenticated' => $isAuthenticated
            ]);

            return $this->json([
                'success' => true,
                'data' => [
                    'agents' => $agents,
                    'isAdmin' => $isAdmin
                ]
            ]);
        } catch (\Exception $e) {
            // Journalisation détaillée de l'erreur
            Logger::error('Erreur lors de la récupération des agents via API', [
                'error_message' => $e->getMessage(),
                'error_trace' => $e->getTraceAsString(),
                'user_id' => $_SESSION['user']['id'] ?? $_SESSION['user_id'] ?? null,
                'error_line' => $e->getLine(),
                'error_file' => $e->getFile()
            ]);

            return $this->sendApiError(5101, 'Erreur lors de la récupération des agents', [
                'error_message' => $e->getMessage(),
                'error_line' => $e->getLine(),
                'method' => 'getAllAgents'
            ]);
        }
    }
    
    /**
     * Crée un nouvel agent de monitoring via l'API
     * 
     * @return void
     */
    public function createAgent()
    {
        try {
            // L'authentification est maintenant gérée par le middleware SessionAuthMiddleware
            // Récupérer les données utilisateur depuis différentes structures possibles
            $userId = $_SESSION['user']['id'] ?? $_SESSION['user_id'] ?? null;
            
            if (!$userId) {
                return $this->sendApiError(2001, 'Utilisateur non authentifié, connexion requise');
            }
            
            // Récupérer les données envoyées
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Vérifier les données minimales requises
            if (!isset($data['name'])) {
                return $this->sendApiError(5106, 'Le nom de l\'agent est requis');
            }
            
            $name = $data['name'];
            $description = $data['description'] ?? '';
            $type = $data['type'] ?? 'server';
            $isPublic = isset($data['is_public']) ? (bool)$data['is_public'] : false;
            
            // Vérifier si un agent avec ce nom existe déjà pour cet utilisateur
            $existingAgent = $this->db->queryOne(
                "SELECT id FROM monitoring_agents WHERE name = :name AND user_id = :user_id",
                ['name' => $name, 'user_id' => $userId]
            );
            
            if ($existingAgent) {
                return $this->sendApiError(5107, 'Un agent avec ce nom existe déjà', [
                    'agent_id' => $existingAgent['id'],
                    'agent_name' => $name
                ]);
            }
            
            // Générer un UUID et un token unique
            $uuid = bin2hex(random_bytes(16));
            $token = bin2hex(random_bytes(32));
            
            // Insérer le nouvel agent
            try {
                $agentId = $this->db->insert('monitoring_agents', [
                    'name' => $name,
                    'description' => $description,
                    'type' => $type,
                    'uuid' => $uuid,
                    'token' => $token,
                    'user_id' => $userId,
                    'is_public' => $isPublic ? 1 : 0,
                    'status' => 'inactive',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            } catch (\Exception $dbEx) {
                return $this->sendApiError(4004, 'Erreur lors de l\'insertion en base de données', [
                    'sql_error' => $dbEx->getMessage(),
                    'method' => 'createAgent:insert'
                ]);
            }
            
            if (!$agentId) {
                return $this->sendApiError(5103, 'Erreur lors de la création de l\'agent, ID non généré');
            }
            
            // Récupérer l'agent créé
            try {
                $agent = $this->db->queryOne("
                    SELECT * FROM monitoring_agents WHERE id = :id
                ", ['id' => $agentId]);
            } catch (\Exception $dbEx) {
                return $this->sendApiError(4002, 'Erreur lors de la récupération de l\'agent créé', [
                    'sql_error' => $dbEx->getMessage(),
                    'agent_id' => $agentId,
                    'method' => 'createAgent:select'
                ]);
            }
            
            // Logger l'action
            Logger::info('Nouvel agent créé via API', [
                'agent_id' => $agentId,
                'agent_uuid' => $uuid,
                'user_id' => $userId,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);
            
            return $this->json([
                'success' => true,
                'message' => 'Agent créé avec succès',
                'data' => [
                    'agent' => [
                        'id' => $agentId,
                        'uuid' => $uuid,
                        'name' => $name,
                        'description' => $description,
                        'type' => $type,
                        'token' => $token,
                        'status' => 'inactive',
                        'is_public' => $isPublic,
                        'created_at' => date('Y-m-d H:i:s')
                    ]
                ]
            ]);
            
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la création d\'un agent via API', [
                'error' => $e->getMessage(),
                'user_id' => $_SESSION['user']['id'] ?? $_SESSION['user_id'] ?? null,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);
            
            return $this->sendApiError(5103, 'Erreur lors de la création de l\'agent', [
                'error_message' => $e->getMessage(),
                'error_line' => $e->getLine(),
                'method' => 'createAgent'
            ]);
        }
    }
    
    /**
     * Récupère la configuration d'un agent
     * 
     * @param int $id ID de l'agent
     * @return void
     */
    public function getConfiguration($id)
    {
        try {
            if (!$id || !is_numeric($id)) {
                return $this->sendApiError(3004, 'ID d\'agent invalide');
            }
            
            $db = new \App\Core\Database();
            
            try {
                // Récupérer l'agent et sa configuration
                $agent = $db->queryOne("
                    SELECT 
                        a.*,
                        COALESCE(ac.config_value, '{}') as configuration
                    FROM monitoring_agents a
                    LEFT JOIN monitoring_agent_configs ac ON a.id = ac.agent_id AND ac.config_key = 'configuration'
                    WHERE a.id = :id
                ", ['id' => $id]);

                if (!$agent) {
                    return $this->sendApiError(5102, 'Agent non trouvé', [
                        'agent_id' => $id
                    ]);
                }

                // Si pas de configuration, utiliser la configuration par défaut
                $config = json_decode($agent['configuration'], true) ?: [
                    'agent' => [
                        'version' => $agent['version'] ?? 'P-2.0.0-Grizzly',
                        'interval' => 60,
                        'log_level' => 'INFO',
                        'log_file' => '/var/log/monitoring-agent.log',
                        'use_remote_config' => true,
                        'remote_config_interval' => 300
                    ],
                    'api' => [
                        'base_url' => getenv('APP_URL') . '/api',
                        'uuid' => $agent['uuid'],
                        'token' => $agent['token'],
                        'timeout' => 30
                    ],
                    'collectors' => [
                        'cpu_collector' => [
                            'enabled' => true,
                            'interval' => 1
                        ],
                        'memory_collector' => [
                            'enabled' => true
                        ],
                        'disk_collector' => [
                            'enabled' => true,
                            'exclude_paths' => [],
                            'include_paths' => [],
                            'exclude_fs_types' => ['squashfs', 'devtmpfs', 'tmpfs']
                        ],
                        'network_collector' => [
                            'enabled' => true,
                            'exclude_interfaces' => [],
                            'include_interfaces' => []
                        ],
                        'docker_collector' => [
                            'enabled' => false,
                            'docker_socket' => '/var/run/docker.sock'
                        ],
                        'web_service_collector' => [
                            'enabled' => false,
                            'services' => [],
                            'timeout' => 10,
                            'verify_ssl' => true
                        ]
                    ],
                    'alerts' => [
                        'enabled' => true,
                        'cpu' => [
                            'high_usage' => [
                                'threshold' => 90,
                                'duration' => 300
                            ]
                        ],
                        'memory' => [
                            'high_usage' => [
                                'threshold' => 90,
                                'duration' => 300
                            ]
                        ],
                        'disk' => [
                            'high_usage' => [
                                'threshold' => 90,
                                'duration' => 300
                            ]
                        ]
                    ]
                ];

                return $this->sendSuccess([
                    'config' => $config,
                    'agent' => [
                        'id' => $agent['id'],
                        'name' => $agent['name'],
                        'uuid' => $agent['uuid'],
                        'version' => $agent['version']
                    ]
                ]);

            } catch (\Exception $dbEx) {
                Logger::error('Erreur lors de la requête de configuration de l\'agent', [
                    'sql_error' => $dbEx->getMessage(),
                    'agent_id' => $id,
                    'method' => 'getConfiguration:select'
                ]);
                return $this->sendApiError(4002, 'Erreur lors de la requête de configuration', [
                    'error_message' => $dbEx->getMessage()
                ]);
            }
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération de la configuration de l\'agent', [
                'error' => $e->getMessage(),
                'agent_id' => $id
            ]);
            
            return $this->sendApiError(5301, 'Erreur lors de la récupération de la configuration', [
                'error_message' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Sauvegarde la configuration d'un agent
     * 
     * @param int $id ID de l'agent
     * @return void
     */
    public function saveConfiguration($id)
    {
        try {
            if (!$id || !is_numeric($id)) {
                return $this->sendApiError(3004, 'ID d\'agent invalide');
            }
            
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['config']) || !is_array($data['config'])) {
                return $this->sendApiError(5304, 'Configuration manquante ou invalide');
            }
            
            $db = new \App\Core\Database();
            
            try {
                // Vérifier que l'agent existe
                $agent = $db->queryOne("SELECT id FROM monitoring_agents WHERE id = :id", ['id' => $id]);
                
                if (!$agent) {
                    return $this->sendApiError(5102, 'Agent non trouvé', ['agent_id' => $id]);
                }
                
                // Supprimer l'ancienne configuration
                $db->execute("
                    DELETE FROM monitoring_agent_configs 
                    WHERE agent_id = :agent_id AND config_key = 'configuration'
                ", ['agent_id' => $id]);
                
                // Insérer la nouvelle configuration
                $db->execute("
                    INSERT INTO monitoring_agent_configs (agent_id, config_key, config_value) 
                    VALUES (:agent_id, 'configuration', :config_value)
                ", [
                    'agent_id' => $id,
                    'config_value' => json_encode($data['config'])
                ]);
                
                // Mettre à jour la date de modification de l'agent
                $db->execute("
                    UPDATE monitoring_agents 
                    SET updated_at = NOW() 
                    WHERE id = :id
                ", ['id' => $id]);
                
                Logger::info('Configuration de l\'agent mise à jour', [
                    'agent_id' => $id,
                    'user_id' => $_SESSION['user']['id'] ?? null
                ]);
                
                return $this->sendSuccess(null, 'Configuration sauvegardée avec succès');
                
            } catch (\Exception $dbEx) {
                Logger::error('Erreur lors de la mise à jour de la configuration', [
                    'sql_error' => $dbEx->getMessage(),
                    'agent_id' => $id,
                    'method' => 'saveConfiguration:update'
                ]);
                
                return $this->sendApiError(4005, 'Erreur lors de la mise à jour de la configuration', [
                    'error_message' => $dbEx->getMessage()
                ]);
            }
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la sauvegarde de la configuration', [
                'error' => $e->getMessage(),
                'agent_id' => $id
            ]);
            
            return $this->sendApiError(5301, 'Erreur lors de la sauvegarde de la configuration', [
                'error_message' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Enregistre un nouvel agent
     */
    public function register()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['name']) || !isset($data['type'])) {
                $this->sendApiError(3002, 'Nom et type d\'agent requis', [
                    'required_fields' => ['name', 'type'],
                    'received' => array_keys($data)
                ]);
            }
            
            // Extraire les données
            $name = $data['name'];
            $type = $data['type'];
            $description = $data['description'] ?? '';
            $isPublic = isset($data['is_public']) ? (bool)$data['is_public'] : false;
            
            // Générer un UUID unique pour l'agent
            $uuid = bin2hex(random_bytes(16));
            
            // Générer un token d'agent pour l'authentification (optionnel)
            $token = bin2hex(random_bytes(32));
            
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            // Vérifier d'abord si un agent avec ce nom existe déjà
            $stmt = $pdo->prepare("SELECT id FROM monitoring_agents WHERE name = :name");
            $stmt->execute(['name' => $name]);
            if ($stmt->rowCount() > 0) {
                $this->sendApiError(5107, 'Un agent avec ce nom existe déjà', [
                    'agent_name' => $name
                ]);
            }
            
            $stmt = $pdo->prepare("
                INSERT INTO monitoring_agents (name, type, description, status, uuid, token, is_public, created_at)
                VALUES (:name, :type, :description, :status, :uuid, :token, :is_public, NOW())
            ");
            
            $stmt->execute([
                'name' => $name,
                'type' => $type,
                'description' => $description,
                'status' => 'active',
                'uuid' => $uuid,
                'token' => $token,
                'is_public' => $isPublic ? 1 : 0
            ]);
            
            $agentId = $pdo->lastInsertId();
            
            // Journaliser la création réussie
            Logger::info('Agent créé avec succès', [
                'agent_id' => $agentId,
                'uuid' => $uuid,
                'name' => $name,
                'type' => $type
            ]);
            
            $this->sendSuccess([
                'id' => $agentId,
                'uuid' => $uuid,
                'type' => $type,
                'token' => $token,
                'name' => $name,
                'description' => $description,
                'is_public' => $isPublic,
                'message' => 'Agent enregistré avec succès'
            ]);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de l\'enregistrement de l\'agent', [
                'error' => $e->getMessage()
            ]);
            $this->sendApiError(5103, 'Erreur lors de l\'enregistrement de l\'agent', [
                'error' => $e->getMessage(),
                'method' => 'register'
            ]);
        }
    }
    
    /**
     * Met à jour les services d'un agent
     */
    public function updateServices()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['agent_id']) || !isset($data['services'])) {
                $this->sendApiError(3002, 'ID d\'agent et services requis', [
                    'required_fields' => ['agent_id', 'services'],
                    'received' => array_keys($data)
                ]);
            }
            
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            // Supprimer les anciens services
            $stmt = $pdo->prepare("DELETE FROM luma_monitoring_services WHERE agent_id = :agent_id");
            $stmt->execute(['agent_id' => $data['agent_id']]);
            
            // Insérer les nouveaux services
            $stmt = $pdo->prepare("
                INSERT INTO luma_monitoring_services (agent_id, name, status, last_check)
                VALUES (:agent_id, :name, :status, NOW())
            ");
            
            foreach ($data['services'] as $service) {
                $stmt->execute([
                    'agent_id' => $data['agent_id'],
                    'name' => $service['name'],
                    'status' => $service['status'] ?? 'unknown'
                ]);
            }
            
            $this->sendSuccess(null, 'Services mis à jour avec succès');
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la mise à jour des services', [
                'error' => $e->getMessage()
            ]);
            $this->sendApiError(5404, 'Erreur lors de la mise à jour des services', [
                'error' => $e->getMessage(),
                'method' => 'updateServices'
            ]);
        }
    }
    
    /**
     * Crée une nouvelle alerte
     */
    public function createAlert()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['agent_id']) || !isset($data['message'])) {
                $this->sendApiError(3002, 'ID d\'agent et message requis', [
                    'required_fields' => ['agent_id', 'message'],
                    'received' => array_keys($data)
                ]);
            }
            
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("
                INSERT INTO luma_monitoring_alerts (agent_id, message, level, created_at)
                VALUES (:agent_id, :message, :level, NOW())
            ");
            
            $stmt->execute([
                'agent_id' => $data['agent_id'],
                'message' => $data['message'],
                'level' => $data['level'] ?? 'info'
            ]);
            
            $alertId = $pdo->lastInsertId();
            
            $this->sendSuccess([
                'id' => $alertId,
                'message' => 'Alerte créée avec succès'
            ]);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la création de l\'alerte', [
                'error' => $e->getMessage()
            ]);
            $this->sendApiError(5103, 'Erreur lors de la création de l\'alerte', [
                'error' => $e->getMessage(),
                'method' => 'createAlert'
            ]);
        }
    }
    
    /**
     * Récupère les tâches d'un agent
     */
    public function getTasks()
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->query("
                SELECT * FROM luma_monitoring_tasks
                WHERE status = 'pending'
                ORDER BY priority DESC, created_at ASC
            ");
            
            $tasks = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            $this->sendSuccess($tasks);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération des tâches', [
                'error' => $e->getMessage()
            ]);
            $this->sendApiError(5501, 'Erreur lors de la récupération des tâches', [
                'error' => $e->getMessage(),
                'method' => 'getTasks'
            ]);
        }
    }
    
    /**
     * Met à jour le statut d'une tâche
     */
    public function updateTaskStatus($id)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['status'])) {
                $this->sendApiError(3002, 'Statut requis', [
                    'required_fields' => ['status'],
                    'received' => array_keys($data)
                ]);
            }
            
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("
                UPDATE luma_monitoring_tasks
                SET status = :status,
                    completed_at = NOW()
                WHERE id = :id
            ");
            
            $stmt->execute([
                'id' => $id,
                'status' => $data['status']
            ]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendApiError(5502, 'Tâche non trouvée', [
                    'task_id' => $id
                ]);
            }
            
            $this->sendSuccess(null, 'Statut de la tâche mis à jour avec succès');
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la mise à jour du statut de la tâche', [
                'error' => $e->getMessage(),
                'task_id' => $id
            ]);
            $this->sendApiError(5504, 'Erreur lors de la mise à jour de la tâche', [
                'error' => $e->getMessage(),
                'task_id' => $id,
                'method' => 'updateTaskStatus'
            ]);
        }
    }
    
    /**
     * Récupère la configuration globale du monitoring
     */
    public function getConfig()
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->query("
                SELECT * FROM luma_monitoring_config
                WHERE id = 1
            ");
            
            $config = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$config) {
                $this->sendApiError(5302, 'Configuration introuvable', [
                    'id' => 1
                ]);
            }
            
            $this->sendSuccess($config);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération de la configuration', [
                'error' => $e->getMessage()
            ]);
            $this->sendApiError(5301, 'Erreur lors de la récupération de la configuration', [
                'error' => $e->getMessage(),
                'method' => 'getConfig'
            ]);
        }
    }

    /**
     * Retourne une réponse JSON formatée
     * 
     * @param array $data Les données à retourner
     * @param int $status Le code HTTP de la réponse
     * @return void
     */
    protected function json($data, $status = 200)
    {
        try {
            // Définir les en-têtes pour JSON
            header('Content-Type: application/json; charset=utf-8');
            http_response_code($status);
            
            // Encoder les données en JSON
            $jsonData = json_encode($data);
            
            // Si l'encodage a échoué, lancer une exception
            if ($jsonData === false) {
                Logger::error('Erreur lors de l\'encodage JSON', [
                    'json_error' => json_last_error_msg(),
                    'data' => var_export($data, true)
                ]);
                
                // Utiliser la classe ApiErrors pour l'erreur d'encodage JSON
                http_response_code(500);
                echo json_encode(\App\Core\ApiErrors::formatError(1004, 'Erreur lors de l\'encodage JSON', [
                    'json_error' => json_last_error_msg()
                ]));
                exit;
            }
            
            // Afficher les données JSON
            echo $jsonData;
            exit;
        } catch (\Exception $e) {
            Logger::error('Exception dans la méthode json', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            // Utiliser la classe ApiErrors pour l'erreur serveur
            http_response_code(500);
            echo json_encode(\App\Core\ApiErrors::formatError(1001, 'Erreur serveur interne', [
                'error_message' => $e->getMessage()
            ]));
            exit;
        }
    }
} 