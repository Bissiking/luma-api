<?php

/**
 * Bootstrap du module API de LUMA
 * 
 * Ce fichier est le point d'entrée pour toutes les requêtes API.
 * L'API nécessite obligatoirement un accès à la base de données.
 */

namespace LumaApi;

// Une classe de routeur spécifique à l'API pourrait être définie ici
class ApiRouter {
    private $config;
    private $routes = [];
    private $database;
    
    public function __construct(array $config, \Core\Database $database = null) {
        $this->config = $config;
        $this->database = $database;
        
        // L'API nécessite obligatoirement une connexion à la base de données
        if ($database === null) {
            $this->sendDatabaseError();
        }
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
        
        // Nouvelle vérification de la base de données avant chaque requête
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
            'message' => 'Route API non trouvée'
        ]);
        exit;
    }
    
    /**
     * Envoie une erreur de base de données et termine le script
     */
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

// Récupération de l'instance de l'application depuis $GLOBALS
$app = $GLOBALS['app'] ?? null;

// Récupération de la base de données, obligatoire pour l'API
$database = $app ? $app->getDatabase() : null;

// Vérification que la base de données est accessible
if ($database === null) {
    // Si la base de données n'est pas accessible, on tente de la connecter
    if ($app && $app->connectToDatabase()) {
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

// Création du routeur API
$apiRouter = new ApiRouter($config, $database);

// Chargement des routes API
require_once __DIR__ . '/routes/api.php';

// Dispatch de la requête API
$apiRouter->dispatch(); 