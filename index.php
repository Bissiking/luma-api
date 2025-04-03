<?php

/**
 * Bootstrap du module API de LUMA
 * 
 * Ce fichier est le point d'entrée pour toutes les requêtes API.
 * L'API nécessite obligatoirement un accès à la base de données.
 */

namespace LumaApi;

use Core\Database;
use Core\Application;

// Chargement de l'autoloader principal
require_once __DIR__ . '/../core/autoload.php';

// Chargement de la configuration
$config = require_once __DIR__ . '/../core/config/database.php';

// Initialisation de l'application principale si elle n'existe pas
if (!isset($GLOBALS['app'])) {
    $app = new Application($config);
    $GLOBALS['app'] = $app;
}

// Récupération de l'instance de l'application depuis $GLOBALS
$app = $GLOBALS['app'];

// Récupération de la base de données, obligatoire pour l'API
$database = $app->getDatabase();

// Vérification que la base de données est accessible
if ($database === null) {
    // Si la base de données n'est pas accessible, on tente de la connecter
    if ($app->connectToDatabase()) {
        $database = $app->getDatabase();
    } else {
        // Erreur fatale pour l'API si pas de base de données
        header('Content-Type: application/json');
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => 'Service API indisponible',
            'error' => 'Base de données inaccessible'
        ]);
        exit;
    }
}

// Configuration CORS
header('Access-Control-Allow-Origin: https://dev.mhemery.fr');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');

// Réponse aux requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Une classe de routeur spécifique à l'API pourrait être définie ici
class ApiRouter {
    private $config;
    private $routes = [];
    private $database;
    
    public function __construct(array $config, Database $database) {
        $this->config = $config;
        $this->database = $database;
    }
    
    public function get($route, $handler) {
        $this->routes['GET'][$route] = $handler;
        return $this;
    }
    
    public function post($route, $handler) {
        $this->routes['POST'][$route] = $handler;
        return $this;
    }
    
    public function put($route, $handler) {
        $this->routes['PUT'][$route] = $handler;
        return $this;
    }
    
    public function delete($route, $handler) {
        $this->routes['DELETE'][$route] = $handler;
        return $this;
    }
    
    public function dispatch() {
        $method = $_SERVER['REQUEST_METHOD'];
        $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // Suppression du préfixe /api si présent
        if (strpos($uri, '/api') === 0) {
            $uri = substr($uri, 4);
        }
        
        // Si l'URI est vide après suppression du préfixe, on le met à '/'
        if (empty($uri)) {
            $uri = '/';
        }
        
        // Vérification de la base de données
        if ($this->database === null) {
            $this->sendDatabaseError();
        }
        
        // Détermine si la route existe
        if (isset($this->routes[$method][$uri])) {
            $handler = $this->routes[$method][$uri];
            
            // Exécute le contrôleur correspondant
            if (is_callable($handler)) {
                $response = $handler();
            } else if (is_string($handler)) {
                // Format: 'ControllerName@method'
                list($controller, $method) = explode('@', $handler);
                $controllerClass = "\\LumaApi\\Controllers\\{$controller}";
                $controller = new $controllerClass($this->database);
                $response = $controller->$method();
            }
            
            // Envoie la réponse au format JSON
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        }
        
        // Route non trouvée
        header('Content-Type: application/json');
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Route API non trouvée',
            'details' => [
                'method' => $method,
                'uri' => $uri,
                'available_routes' => array_keys($this->routes[$method] ?? [])
            ]
        ]);
        exit;
    }
    
    private function sendDatabaseError(): void {
        header('Content-Type: application/json');
        http_response_code(503);
        echo json_encode([
            'success' => false,
            'message' => 'Erreur de connexion à la base de données',
            'error' => 'Le service API n\'est pas disponible actuellement car la base de données est inaccessible'
        ]);
        exit;
    }
}

// Création du routeur API
$apiRouter = new ApiRouter($config, $database);

// Chargement des routes API
require_once __DIR__ . '/routes/api.php';

// Dispatch de la requête API
$apiRouter->dispatch(); 