<?php

namespace LumaApi\Controllers;

use Core\Database;

class SystemController extends BaseController
{
    protected Database $database;

    public function __construct(Database $database)
    {
        parent::__construct($database);
        $this->database = $database;
    }

    /**
     * Récupère le statut de tous les services système
     * 
     * @return array
     */
    public function getStatuses(): array
    {
        try {
            // Vérification de la connexion à la base de données
            $dbStatus = $this->database->getConnection() ? 'online' : 'offline';
            
            // Vérification du statut des services principaux
            $services = [
                'database' => [
                    'status' => $dbStatus,
                    'last_check' => date('Y-m-d H:i:s')
                ],
                'api' => [
                    'status' => 'online',
                    'version' => '1.0.0',
                    'last_check' => date('Y-m-d H:i:s')
                ],
                'core' => [
                    'status' => 'online',
                    'last_check' => date('Y-m-d H:i:s')
                ]
            ];

            return [
                'success' => true,
                'data' => [
                    'services' => $services,
                    'timestamp' => time()
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération des statuts',
                'error' => $e->getMessage()
            ];
        }
    }
} 