<?php

/**
 * Fichier de routes pour le module API de LUMA
 * 
 * Ce fichier définit toutes les routes disponibles pour l'API LUMA.
 */

// Vérification que ce fichier est appelé depuis le bootstrap
if (!isset($apiRouter) || !($apiRouter instanceof \LumaApi\ApiRouter)) {
    die('Accès direct au script interdit');
}

// Routes d'authentification
$apiRouter->post('/api/auth/login', 'AuthController@login');
$apiRouter->post('/api/auth/register', 'AuthController@register');
$apiRouter->post('/api/auth/logout', 'AuthController@logout');

// Routes pour les utilisateurs
$apiRouter->get('/api/users', 'UserController@index');
$apiRouter->get('/api/users/{id}', 'UserController@show');
$apiRouter->post('/api/users', 'UserController@store');
$apiRouter->put('/api/users/{id}', 'UserController@update');
$apiRouter->delete('/api/users/{id}', 'UserController@delete');

// Routes pour les tickets
$apiRouter->get('/api/tickets', 'TicketController@index');
$apiRouter->get('/api/tickets/{id}', 'TicketController@show');
$apiRouter->post('/api/tickets', 'TicketController@store');
$apiRouter->put('/api/tickets/{id}', 'TicketController@update');
$apiRouter->delete('/api/tickets/{id}', 'TicketController@delete');

// Routes pour les instances Nino
$apiRouter->get('/api/nino/instances', 'NinoController@getAllInstances');
$apiRouter->get('/api/nino/instances/{id}', 'NinoController@getInstance');
$apiRouter->post('/api/nino/instances', 'NinoController@createInstance');
$apiRouter->put('/api/nino/instances/{id}', 'NinoController@updateInstance');
$apiRouter->delete('/api/nino/instances/{id}', 'NinoController@deleteInstance');

// Routes pour les vidéos Nino
$apiRouter->get('/api/nino/videos', 'NinoController@getAllVideos');
$apiRouter->get('/api/nino/videos/{id}', 'NinoController@getVideo');
$apiRouter->post('/api/nino/videos', 'NinoController@createVideo');
$apiRouter->put('/api/nino/videos/{id}', 'NinoController@updateVideo');
$apiRouter->delete('/api/nino/videos/{id}', 'NinoController@deleteVideo');

// Routes pour les catégories Nino
$apiRouter->get('/api/nino/categories', 'NinoController@getAllCategories');
$apiRouter->get('/api/nino/categories/{id}', 'NinoController@getCategory');
$apiRouter->post('/api/nino/categories', 'NinoController@createCategory');
$apiRouter->put('/api/nino/categories/{id}', 'NinoController@updateCategory');
$apiRouter->delete('/api/nino/categories/{id}', 'NinoController@deleteCategory');

// Routes pour les agents de monitoring
$apiRouter->get('/api/monitoring/agents', 'MonitoringController@getAllAgents');
$apiRouter->get('/api/monitoring/agents/{id}', 'MonitoringController@getAgent');
$apiRouter->post('/api/monitoring/agents', 'MonitoringController@createAgent');
$apiRouter->put('/api/monitoring/agents/{id}', 'MonitoringController@updateAgent');
$apiRouter->delete('/api/monitoring/agents/{id}', 'MonitoringController@deleteAgent');

// Routes pour la configuration des agents
$apiRouter->get('/api/monitoring/agents/{id}/configuration', 'MonitoringController@getConfiguration');
$apiRouter->post('/api/monitoring/agents/{id}/configuration', 'MonitoringController@saveConfiguration');

// Routes pour les métriques des agents
$apiRouter->post('/api/monitoring/agents/{id}/metrics', 'MonitoringController@storeMetrics');
$apiRouter->get('/api/monitoring/agents/{id}/metrics', 'MonitoringController@getMetrics');

// Routes pour le status des services
$apiRouter->get('/api/services/status', 'SystemController@getStatuses'); 