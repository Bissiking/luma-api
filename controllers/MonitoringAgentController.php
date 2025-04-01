<?php

namespace App\Api\Controllers;

use App\Core\BaseController;
use App\Core\Logger;
use Exception;

class MonitoringAgentController extends BaseController
{
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Retourne la liste des agents au format JSON
     */
    public function index()
    {
        try {
            // Si l'utilisateur est admin, récupérer tous les agents
            // Sinon, récupérer uniquement les agents de l'utilisateur
            $isAdmin = $this->isAdmin();
            
            $query = "SELECT * FROM monitoring_agents";
            
            if (!$isAdmin) {
                $query .= " WHERE user_id = :user_id";
                $agents = $this->db->query($query, ['user_id' => $_SESSION['user']['id']]);
            } else {
                $agents = $this->db->query($query);
            }

            return $this->json([
                'success' => true,
                'data' => [
                    'agents' => $agents,
                    'isAdmin' => $isAdmin
                ]
            ]);
        } catch (Exception $e) {
            Logger::error('Erreur lors de la récupération des agents via API', [
                'error' => $e->getMessage(),
                'user_id' => $_SESSION['user']['id'] ?? null
            ]);

            return $this->json([
                'success' => false,
                'error' => 'Une erreur est survenue lors de la récupération des agents.'
            ], 500);
        }
    }

    /**
     * Retourne les détails d'un agent spécifique
     */
    public function show($id)
    {
        try {
            $agent = $this->db->queryOne("
                SELECT * FROM monitoring_agents WHERE id = :id
            ", ['id' => $id]);

            if (!$agent) {
                return $this->json([
                    'success' => false,
                    'error' => 'Agent non trouvé.'
                ], 404);
            }

            if (!$this->isAdmin() && $agent['user_id'] != $_SESSION['user']['id']) {
                return $this->json([
                    'success' => false,
                    'error' => 'Vous n\'avez pas accès à cet agent.'
                ], 403);
            }

            return $this->json([
                'success' => true,
                'data' => [
                    'agent' => $agent
                ]
            ]);
        } catch (Exception $e) {
            Logger::error('Erreur lors de la récupération des détails de l\'agent via API', [
                'error' => $e->getMessage(),
                'agent_id' => $id,
                'user_id' => $_SESSION['user']['id'] ?? null
            ]);

            return $this->json([
                'success' => false,
                'error' => 'Une erreur est survenue lors de la récupération des détails de l\'agent.'
            ], 500);
        }
    }

    /**
     * Enregistre les métriques envoyées par un agent
     * 
     * @param string $uuid UUID de l'agent
     * @return array Réponse JSON
     */
    public function storeMetrics($uuid)
    {
        try {
            // L'agent est déjà authentifié par le middleware
            $agent = $_REQUEST['agent'] ?? null;
            
            if (!$agent) {
                // Ce cas ne devrait jamais arriver avec le middleware
                return $this->json([
                    'success' => false,
                    'error' => 'Erreur interne: informations d\'agent manquantes.'
                ], 500);
            }

            // Récupérer les métriques envoyées
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['metrics']) || !is_array($data['metrics'])) {
                return $this->json([
                    'success' => false,
                    'error' => 'Format de données invalide.'
                ], 400);
            }

            // Insérer chaque métrique
            foreach ($data['metrics'] as $metric) {
                if (!isset($metric['name']) || !isset($metric['value'])) {
                    continue;
                }

                $this->db->execute("
                    INSERT INTO monitoring_metrics (agent_id, name, value, unit) 
                    VALUES (:agent_id, :name, :value, :unit)
                ", [
                    'agent_id' => $agent['id'],
                    'name' => $metric['name'],
                    'value' => $metric['value'],
                    'unit' => $metric['unit'] ?? null
                ]);
            }

            // Mettre à jour le last_check_in de l'agent
            $this->db->execute("
                UPDATE monitoring_agents 
                SET last_check_in = NOW(), 
                    status = 'active',
                    ip_address = :ip
                WHERE id = :id
            ", [
                'id' => $agent['id'],
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);

            return $this->json([
                'success' => true,
                'message' => 'Métriques enregistrées avec succès.'
            ]);

        } catch (Exception $e) {
            Logger::error('Erreur lors de l\'enregistrement des métriques', [
                'error' => $e->getMessage(),
                'agent_uuid' => $uuid,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);

            return $this->json([
                'success' => false,
                'error' => 'Une erreur est survenue lors de l\'enregistrement des métriques.'
            ], 500);
        }
    }

    /**
     * Récupère la configuration d'un agent
     * 
     * @param int $id Identifiant de l'agent
     * @return void
     */
    public function getConfiguration($id)
    {
        try {
            // Récupérer l'agent
            $agent = $this->db->queryOne("
                SELECT * FROM monitoring_agents 
                WHERE id = :id
            ", ['id' => $id]);

            if (!$agent) {
                return $this->json([
                    'success' => false,
                    'message' => 'Agent non trouvé'
                ], 404);
            }

            // Récupérer les services de l'agent
            $services = $this->db->query("
                SELECT * FROM monitoring_services 
                WHERE agent_id = :agent_id
            ", ['agent_id' => $id]);

            // Construire la configuration
            $configuration = [
                'agent' => [
                    'uuid' => $agent['uuid'],
                    'token' => $agent['token'],
                    'name' => $agent['name'],
                    'check_interval' => $agent['check_interval'] ?? 60, // Intervalle par défaut : 60 secondes
                    'api_url' => getenv('APP_URL') . '/api'
                ],
                'services' => []
            ];

            // Ajouter les services à surveiller
            foreach ($services as $service) {
                $configuration['services'][] = [
                    'id' => $service['id'],
                    'name' => $service['name'],
                    'type' => $service['type'],
                    'config' => json_decode($service['config'], true),
                    'check_interval' => $service['check_interval'],
                    'enabled' => $service['enabled'] == 1
                ];
            }

            return $this->json([
                'success' => true,
                'data' => $configuration
            ]);
        } catch (Exception $e) {
            Logger::error('Erreur lors de la récupération de la configuration de l\'agent', [
                'error' => $e->getMessage(),
                'agent_id' => $id
            ]);

            return $this->json([
                'success' => false,
                'message' => 'Une erreur est survenue lors de la récupération de la configuration'
            ], 500);
        }
    }

    /**
     * Récupère la configuration d'un agent par son UUID
     * 
     * @param string $uuid UUID de l'agent
     * @return array Réponse JSON avec la configuration
     */
    public function getConfigurationByUuid($uuid)
    {
        try {
            // L'agent est déjà authentifié par le middleware
            $agent = $_REQUEST['agent'] ?? null;
            
            if (!$agent) {
                // Ce cas ne devrait jamais arriver avec le middleware
                return $this->sendApiError(5100, 'Erreur interne: informations d\'agent manquantes');
            }
            
            // Récupérer la configuration depuis la base de données
            $configs = $this->db->query("
                SELECT config_key, config_value FROM monitoring_agent_configs
                WHERE agent_id = :agent_id
            ", ['agent_id' => $agent['id']]);
            
            // Si aucune configuration n'existe, renvoyer la configuration par défaut
            if (empty($configs)) {
                $config = $this->getDefaultConfiguration($uuid);
            } else {
                // Sinon, reconstruire la configuration à partir des enregistrements en base
                $config = $this->buildConfigFromDbRecords($configs);
            }
            
            return $this->json([
                'success' => true,
                'data' => [
                    'config' => $config,
                    'agent' => [
                        'id' => $agent['id'],
                        'name' => $agent['name'],
                        'uuid' => $uuid
                    ]
                ],
                'message' => 'Configuration récupérée avec succès'
            ]);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération de la configuration', [
                'error' => $e->getMessage(),
                'uuid' => $uuid
            ]);
            
            return $this->sendApiError(5000, 'Erreur lors de la récupération de la configuration', [
                'error_message' => $e->getMessage(),
                'error_line' => $e->getLine(),
                'method' => 'getConfigurationByUuid'
            ]);
        }
    }
    
    /**
     * Construit une configuration structurée à partir des enregistrements en base
     * 
     * @param array $configRecords Enregistrements de configuration depuis la base
     * @return array Configuration structurée
     */
    private function buildConfigFromDbRecords($configRecords)
    {
        $config = [];
        
        foreach ($configRecords as $record) {
            $path = explode('.', $record['config_key']);
            $value = $this->parseConfigValue($record['config_value']);
            
            $this->setNestedValue($config, $path, $value);
        }
        
        return $config;
    }
    
    /**
     * Analyse et convertit une valeur de configuration stockée en base
     * 
     * @param string $value Valeur de configuration stockée
     * @return mixed Valeur convertie (array, boolean, number, string)
     */
    private function parseConfigValue($value)
    {
        // Tentative de décodage JSON
        $decoded = json_decode($value, true);
        
        // Si la valeur est un JSON valide, renvoyer le résultat décodé
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }
        
        // Sinon, effectuer des conversions de type basiques
        if ($value === 'true') return true;
        if ($value === 'false') return false;
        if (is_numeric($value)) {
            // Conserver les entiers comme entiers et les flottants comme flottants
            return strpos($value, '.') !== false ? (float)$value : (int)$value;
        }
        
        // Par défaut, renvoyer la chaîne de caractères
        return $value;
    }
    
    /**
     * Définit une valeur imbriquée dans un tableau multidimensionnel
     * 
     * @param array &$array Tableau dans lequel définir la valeur
     * @param array $path Chemin vers la valeur
     * @param mixed $value Valeur à définir
     */
    private function setNestedValue(&$array, $path, $value)
    {
        $current = &$array;
        
        foreach ($path as $key) {
            if (!isset($current[$key])) {
                $current[$key] = [];
            }
            
            $current = &$current[$key];
        }
        
        $current = $value;
    }

    /**
     * Enregistre un check-in d'un agent (pour signaler qu'il est actif sans envoyer de métriques)
     * 
     * @param string $uuid UUID de l'agent
     * @return array Réponse JSON
     */
    public function health($uuid)
    {
        try {
            // Vérifier si c'est une requête via la route directe ou via middleware
            $agent = $_REQUEST['agent'] ?? null;
            
            // Si l'agent n'est pas trouvé via le middleware, le rechercher directement
            if (!$agent) {
                // Ceci est pour la compatibilité avec la route directe
                // quand le middleware d'authentification n'est pas utilisé
                
                // Rechercher l'agent dans la base de données
                $agent = $this->db->queryOne("
                    SELECT id, token, name FROM monitoring_agents 
                    WHERE uuid = :uuid
                ", ['uuid' => $uuid]);
                
                if (!$agent) {
                    Logger::warning('Agent inconnu lors d\'un check-in direct', [
                        'uuid' => $uuid,
                        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                    ]);
                    
                    return $this->json([
                        'success' => false,
                        'error' => 'Agent non trouvé'
                    ], 404);
                }
                
                // Vérifier le token d'authentification si fourni
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? '';
                $authToken = null;
                
                if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                    $authToken = $matches[1];
                    
                    // Si un token est fourni et qu'il ne correspond pas
                    if ($authToken && $authToken !== $agent['token']) {
                        Logger::warning('Token invalide lors d\'un check-in direct', [
                            'agent_id' => $agent['id'],
                            'uuid' => $uuid,
                            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                        ]);
                        
                        return $this->json([
                            'success' => false,
                            'error' => 'Token d\'authentification invalide'
                        ], 401);
                    }
                }
                
                // Pour la route directe sans middleware, on accepte même sans token
                // pour des raisons de compatibilité (à revoir à terme)
                Logger::debug('Check-in direct accepté sans middleware d\'authentification', [
                    'agent_id' => $agent['id'],
                    'uuid' => $uuid,
                    'with_token' => !empty($authToken)
                ]);
            }

            // Récupérer la version depuis la configuration
            $agentVersion = $this->getAgentVersionFromConfig($uuid);

            // Mettre à jour le statut de l'agent
            $this->db->execute("
                UPDATE monitoring_agents 
                SET last_check_in = NOW(), 
                    status = 'active',
                    ip_address = :ip
                WHERE id = :id
            ", [
                'id' => $agent['id'],
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);

            // Logger l'action
            Logger::info('Agent a effectué un check-in', [
                'agent_uuid' => $uuid,
                'agent_id' => $agent['id'],
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                'version' => $agentVersion
            ]);

            return $this->json([
                'success' => true,
                'message' => 'Check-in enregistré avec succès',
                'data' => [
                    'name' => $agent['name'],
                    'status' => 'active',
                    'check_in_time' => date('Y-m-d H:i:s'),
                    'version' => $agentVersion
                ]
            ]);
        } catch (Exception $e) {
            Logger::error('Erreur lors du check-in de l\'agent', [
                'error' => $e->getMessage(),
                'agent_uuid' => $uuid,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);

            return $this->json([
                'success' => false,
                'error' => 'Une erreur est survenue lors du check-in.'
            ], 500);
        }
    }

    /**
     * Récupère la version d'un agent à partir de sa configuration
     * 
     * @param string $uuid UUID de l'agent
     * @return string Version de l'agent ou valeur par défaut
     */
    private function getAgentVersionFromConfig($uuid)
    {
        try {
            // Vérifier que l'agent existe
            $agent = $this->db->queryOne("
                SELECT id FROM monitoring_agents 
                WHERE uuid = :uuid
            ", ['uuid' => $uuid]);
            
            if (!$agent) {
                return 'P-1.0.0';
            }
            
            // Récupérer la configuration depuis la base de données
            $versionRecord = $this->db->queryOne("
                SELECT config_value FROM monitoring_agent_configs
                WHERE agent_id = :agent_id AND config_key = 'agent.version'
            ", ['agent_id' => $agent['id']]);
            
            if ($versionRecord && !empty($versionRecord['config_value'])) {
                return $versionRecord['config_value'];
            }
            
            // Si pas de version trouvée, récupérer la configuration par défaut
            $defaultConfig = $this->getDefaultConfiguration($uuid);
            return $defaultConfig['agent']['version'] ?? 'P-1.0.0';
            
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération de la version de l\'agent', [
                'error' => $e->getMessage(),
                'uuid' => $uuid
            ]);
            
            return 'P-1.0.0';
        }
    }

    /**
     * Vérifie les mises à jour disponibles pour l'agent
     * 
     * @return array Réponse JSON
     */
    public function getUpdates()
    {
        try {
            // Obtenir l'UUID de l'agent depuis la requête
            $uuid = $_GET['uuid'] ?? null;
            
            // Récupérer la version actuelle de l'agent
            $currentVersion = 'P-1.0.0';
            
            if ($uuid) {
                $currentVersion = $this->getAgentVersionFromConfig($uuid);
            }
            
            // Informations sur la dernière version disponible
            $latestVersion = 'P-2.0.0-Grizzly'; // À remplacer par une requête à la base de données si nécessaire
            $releaseDate = date('Y-m-d');
            $downloadUrl = getenv('APP_URL') . '/downloads/agent/latest';
            $changelogUrl = getenv('APP_URL') . '/agent-changelog';
            
            // Vérifier si une mise à jour est requise
            $requiredUpdate = version_compare($currentVersion, $latestVersion, '<');
            
            // Logger la demande de mise à jour
            Logger::info('Agent a vérifié les mises à jour disponibles', [
                'current_version' => $currentVersion,
                'latest_version' => $latestVersion,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
                'agent_uuid' => $uuid
            ]);

            return $this->json([
                'success' => true,
                'data' => [
                    'latest_version' => $latestVersion,
                    'release_date' => $releaseDate,
                    'update_required' => $requiredUpdate,
                    'download_url' => $downloadUrl,
                    'changelog_url' => $changelogUrl,
                    'features' => [
                        'monitoring' => true,
                        'security' => true,
                        'auto_update' => true,
                        'remote_control' => false
                    ]
                ]
            ]);
        } catch (Exception $e) {
            Logger::error('Erreur lors de la vérification des mises à jour', [
                'error' => $e->getMessage(),
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);

            return $this->json([
                'success' => false,
                'error' => 'Une erreur est survenue lors de la vérification des mises à jour.'
            ], 500);
        }
    }
    
    /**
     * Crée un nouvel agent via l'API publique
     * 
     * @return array Réponse JSON
     */
    public function createAgent()
    {
        try {
            // Récupérer les données envoyées
            $data = json_decode(file_get_contents('php://input'), true);
            
            // Vérifier les données minimales requises
            $name = $data['name'];
            $description = $data['description'] ?? '';
            $user_id = $data['user_id'] ?? null;
            $type = $data['type'] ?? 'server';
            $isPublic = isset($data['is_public']) ? (bool)$data['is_public'] : false;
            
            // Générer un UUID et un token unique
            $uuid = $data['uuid'] ?? bin2hex(random_bytes(16));
            $token = bin2hex(random_bytes(32));
            
            // Insérer le nouvel agent
            $agentId = $this->db->insert('monitoring_agents', [
                'name' => $name,
                'description' => $description,
                'type' => $type,
                'uuid' => $uuid,
                'token' => $token,
                'user_id' => $user_id,
                'is_public' => $isPublic ? 1 : 0,
                'status' => 'inactive',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s')
            ]);
            
            if (!$agentId) {
                throw new \Exception("Erreur lors de la création de l'agent");
            }
            
            // Récupérer l'agent créé
            $agent = $this->db->queryOne("
                SELECT * FROM monitoring_agents WHERE id = :id
            ", ['id' => $agentId]);
            
            // Générer la configuration par défaut
            $config = $this->getDefaultConfiguration($uuid);
            
            // Logger l'action
            Logger::info('Nouvel agent créé via API', [
                'agent_id' => $agentId,
                'agent_uuid' => $uuid,
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
                        'is_public' => $isPublic,
                        'token' => $token,
                        'status' => 'inactive',
                        'created_at' => date('Y-m-d H:i:s')
                    ],
                    'config' => $config
                ]
            ]);
            
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la création d\'un agent via API', [
                'error' => $e->getMessage(),
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);
            
            return $this->json([
                'success' => false,
                'error' => 'Une erreur est survenue lors de la création de l\'agent: ' . $e->getMessage()
            ], 500);
        }
    }
    
    /**
     * Enregistre un lot de métriques envoyées par un agent
     * Cette méthode permet d'enregistrer plusieurs points de métriques en une seule requête
     * 
     * Format attendu:
     * {
     *   "metrics": [
     *     {
     *       "timestamp": "2023-03-18T21:47:15Z",
     *       "name": "cpu_usage",
     *       "value": 45.8,
     *       "unit": "%",
     *       "tags": {
     *         "host": "server1",
     *         "core": "total"
     *       }
     *     },
     *     {...}
     *   ]
     * }
     * 
     * @param string $uuid UUID de l'agent
     * @return array Réponse JSON
     */
    public function storeMetricsBatch($uuid)
    {
        try {
            // L'agent est déjà authentifié par le middleware
            $agent = $_REQUEST['agent'] ?? null;
            
            if (!$agent) {
                // Ce cas ne devrait jamais arriver avec le middleware
                return $this->json([
                    'success' => false,
                    'error' => 'Erreur interne: informations d\'agent manquantes.'
                ], 500);
            }

            // Récupérer les métriques envoyées
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['metrics']) || !is_array($data['metrics']) || empty($data['metrics'])) {
                return $this->json([
                    'success' => false,
                    'error' => 'Format de données invalide ou aucune métrique fournie.'
                ], 400);
            }

            // Optimisation: utiliser une insertion multiple pour toutes les métriques
            $placeholders = [];
            $values = [];
            $index = 0;
            $timestamp = date('Y-m-d H:i:s');

            foreach ($data['metrics'] as $metric) {
                if (!isset($metric['name']) || !isset($metric['value'])) {
                    continue;
                }
                
                // Si un timestamp est fourni, le convertir au format MySQL
                $metricTimestamp = $timestamp;
                if (isset($metric['timestamp'])) {
                    $dt = new \DateTime($metric['timestamp']);
                    if ($dt) {
                        $metricTimestamp = $dt->format('Y-m-d H:i:s');
                    }
                }
                
                // Préparer les tags pour stockage JSON si présents
                $tags = null;
                if (isset($metric['tags']) && !empty($metric['tags'])) {
                    $tags = json_encode($metric['tags']);
                }

                $placeholders[] = "(:agent_id_{$index}, :name_{$index}, :value_{$index}, :unit_{$index}, :tags_{$index}, :created_at_{$index})";
                $values["agent_id_{$index}"] = $agent['id'];
                $values["name_{$index}"] = $metric['name'];
                $values["value_{$index}"] = $metric['value'];
                $values["unit_{$index}"] = $metric['unit'] ?? null;
                $values["tags_{$index}"] = $tags;
                $values["created_at_{$index}"] = $metricTimestamp;
                $index++;
            }

            // S'il y a des métriques valides, les insérer en une seule requête
            if (count($placeholders) > 0) {
                $sql = "INSERT INTO monitoring_metrics (agent_id, name, value, unit, tags, created_at) VALUES " . implode(", ", $placeholders);
                $this->db->execute($sql, $values);
                
                // Logging pour le développement
                Logger::info('Métriques par lot insérées pour l\'agent', [
                    'agent_uuid' => $uuid,
                    'metrics_count' => count($placeholders)
                ]);
            } else {
                return $this->json([
                    'success' => false,
                    'error' => 'Aucune métrique valide fournie.'
                ], 400);
            }

            // Mettre à jour le last_check_in de l'agent
            $this->db->execute("
                UPDATE monitoring_agents 
                SET last_check_in = NOW(), 
                    status = 'active',
                    ip_address = :ip
                WHERE id = :id
            ", [
                'id' => $agent['id'],
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);

            return $this->json([
                'success' => true,
                'message' => 'Lot de métriques enregistré avec succès.',
                'count' => count($placeholders)
            ]);

        } catch (Exception $e) {
            Logger::error('Erreur lors de l\'enregistrement du lot de métriques', [
                'error' => $e->getMessage(),
                'agent_uuid' => $uuid,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);

            return $this->json([
                'success' => false,
                'error' => 'Une erreur est survenue lors de l\'enregistrement du lot de métriques: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupère la configuration par défaut d'un agent par son UUID
     * 
     * @param string $uuid UUID de l'agent
     * @return array Réponse JSON avec la configuration par défaut
     */
    public function getDefaultConfigurationByUuid($uuid)
    {
        try {
            // Vérifier que l'agent existe
            $agent = $this->db->queryOne("
                SELECT id, token FROM monitoring_agents 
                WHERE uuid = :uuid
            ", ['uuid' => $uuid]);
            
            if (!$agent) {
                return $this->sendApiError(5102, 'Agent non trouvé', [
                    'uuid' => $uuid
                ]);
            }
            
            // Récupérer la configuration par défaut
            $defaultConfig = $this->getDefaultConfiguration($uuid);
            
            return $this->json([
                'success' => true,
                'data' => [
                    'config' => $defaultConfig,
                    'agent_uuid' => $uuid
                ],
                'message' => 'Configuration par défaut récupérée avec succès'
            ]);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération de la configuration par défaut', [
                'error' => $e->getMessage(),
                'uuid' => $uuid
            ]);
            
            return $this->sendApiError(5000, 'Erreur lors de la récupération de la configuration par défaut', [
                'error_message' => $e->getMessage(),
                'error_line' => $e->getLine(),
                'method' => 'getDefaultConfigurationByUuid'
            ]);
        }
    }

    /**
     * Sauvegarde la configuration d'un agent par son UUID
     * 
     * @param string $uuid UUID de l'agent
     * @return array Réponse JSON
     */
    public function saveConfigurationByUuid($uuid)
    {
        try {
            // L'agent est déjà authentifié par le middleware
            $agent = $_REQUEST['agent'] ?? null;
            
            if (!$agent) {
                // Ce cas ne devrait jamais arriver avec le middleware
                return $this->sendApiError(5100, 'Erreur interne: informations d\'agent manquantes');
            }
            
            // Récupérer la configuration depuis la requête
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['config']) || !is_array($data['config'])) {
                return $this->sendApiError(3002, 'Configuration invalide ou manquante', [
                    'received' => $data
                ]);
            }
            
            $config = $data['config'];
            
            // Supprimer les anciennes configurations
            $this->db->execute("
                DELETE FROM monitoring_agent_configs
                WHERE agent_id = :agent_id
            ", ['agent_id' => $agent['id']]);
            
            // Insérer les nouvelles configurations
            $this->saveConfigToDb($agent['id'], $config);
            
            Logger::info('Configuration d\'agent mise à jour via API', [
                'agent_id' => $agent['id'],
                'agent_uuid' => $uuid,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? null
            ]);
            
            return $this->json([
                'success' => true,
                'message' => 'Configuration sauvegardée avec succès',
                'data' => [
                    'agent_id' => $agent['id'],
                    'agent_uuid' => $uuid
                ]
            ]);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la sauvegarde de la configuration', [
                'error' => $e->getMessage(),
                'uuid' => $uuid
            ]);
            
            return $this->sendApiError(5000, 'Erreur lors de la sauvegarde de la configuration', [
                'error_message' => $e->getMessage(),
                'error_line' => $e->getLine(),
                'method' => 'saveConfigurationByUuid'
            ]);
        }
    }
    
    /**
     * Sauvegarde une configuration dans la base de données
     * 
     * @param int $agentId ID de l'agent
     * @param array $config Configuration à sauvegarder
     * @param string $prefix Préfixe pour les clés (utilisé pour la récursion)
     */
    private function saveConfigToDb($agentId, $config, $prefix = '')
    {
        foreach ($config as $key => $value) {
            $fullKey = $prefix ? "$prefix.$key" : $key;
            
            if (is_array($value)) {
                // Si la valeur est un tableau, récursion
                $this->saveConfigToDb($agentId, $value, $fullKey);
            } else {
                // Sinon, sauvegarder la valeur
                $this->db->insert('monitoring_agent_configs', [
                    'agent_id' => $agentId,
                    'config_key' => $fullKey,
                    'config_value' => is_bool($value) ? ($value ? 'true' : 'false') : (string)$value,
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s')
                ]);
            }
        }
    }

    /**
     * Génère une configuration par défaut pour un agent
     * 
     * @param string $uuid UUID de l'agent
     * @return array Configuration par défaut
     */
    private function getDefaultConfiguration($uuid)
    {
        // Récupérer le token associé à cet UUID
        $agent = $this->db->queryOne("SELECT token FROM monitoring_agents WHERE uuid = :uuid", ['uuid' => $uuid]);
        $token = $agent['token'] ?? bin2hex(random_bytes(32));
        
        // URL de base de l'API
        $baseUrl = getenv('APP_URL') ?: 'https://monitoring.example.com';
        if (!str_ends_with($baseUrl, '/api')) {
            $baseUrl = rtrim($baseUrl, '/') . '/api';
        }
        
        // Configuration par défaut complète selon les spécifications
        return [
            'agent' => [
                'version' => 'P-2.0.0-Grizzly',
                'interval' => 60,  // Intervalle de collecte des métriques (secondes)
                'log_level' => 'INFO',
                'log_file' => '/var/log/monitoring-agent.log',
                'use_remote_config' => true,
                'remote_config_interval' => 300  // Intervalle de récupération de la configuration distante (secondes)
            ],
            'api' => [
                'base_url' => $baseUrl,
                'uuid' => $uuid,
                'token' => $token,
                'timeout' => 30
            ],
            'collectors' => [
                'cpu_collector' => [
                    'enabled' => true,
                    'interval' => 1  // Intervalle pour calculer l'utilisation CPU
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
                    'enabled' => true,
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
                        'duration' => 300  // Durée en secondes pendant laquelle le seuil doit être dépassé
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
    }
}