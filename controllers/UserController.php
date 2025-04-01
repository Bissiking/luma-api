<?php

namespace App\Api\Controllers;

use App\Core\Logger;

class UserController extends BaseController
{
    /**
     * Liste tous les utilisateurs
     */
    public function index()
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->query("SELECT id, username, name, email, role, account_administrator, account_active, last_login FROM luma_users");
            $users = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            $this->sendSuccess($users);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération des utilisateurs', [
                'error' => $e->getMessage()
            ]);
            $this->sendApiError(4002, 'Erreur lors de la récupération des utilisateurs', [
                'error' => $e->getMessage()
            ]);
        }
    }
    
    /**
     * Affiche un utilisateur spécifique
     */
    public function show($id)
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("SELECT id, username, name, email, role, account_administrator, account_active, last_login FROM luma_users WHERE id = :id");
            $stmt->execute(['id' => $id]);
            $user = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$user) {
                $this->sendApiError(4003, 'Utilisateur non trouvé', ['user_id' => $id]);
            }
            
            $this->sendSuccess($user);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération de l\'utilisateur', [
                'error' => $e->getMessage(),
                'user_id' => $id
            ]);
            $this->sendApiError(4002, 'Erreur lors de la récupération de l\'utilisateur', [
                'error' => $e->getMessage(),
                'user_id' => $id
            ]);
        }
    }
    
    /**
     * Met à jour un utilisateur
     */
    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['name']) && !isset($data['email']) && !isset($data['role'])) {
                $this->sendApiError(3002, 'Aucune donnée à mettre à jour', ['expected_fields' => ['name', 'email', 'role']]);
            }
            
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $updates = [];
            $params = ['id' => $id];
            
            if (isset($data['name'])) {
                $updates[] = "name = :name";
                $params['name'] = $data['name'];
            }
            
            if (isset($data['email'])) {
                $updates[] = "email = :email";
                $params['email'] = $data['email'];
            }
            
            if (isset($data['role'])) {
                $updates[] = "role = :role";
                $params['role'] = $data['role'];
            }
            
            $sql = "UPDATE luma_users SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() === 0) {
                $this->sendApiError(4003, 'Utilisateur non trouvé', ['user_id' => $id]);
            }
            
            $this->sendSuccess(null, 'Utilisateur mis à jour avec succès');
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la mise à jour de l\'utilisateur', [
                'error' => $e->getMessage(),
                'user_id' => $id
            ]);
            $this->sendApiError(4005, 'Erreur lors de la mise à jour de l\'utilisateur', [
                'error' => $e->getMessage(),
                'user_id' => $id
            ]);
        }
    }
    
    /**
     * Supprime un utilisateur
     */
    public function destroy($id)
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("DELETE FROM luma_users WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendApiError(4003, 'Utilisateur non trouvé', ['user_id' => $id]);
            }
            
            $this->sendSuccess(null, 'Utilisateur supprimé avec succès');
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la suppression de l\'utilisateur', [
                'error' => $e->getMessage(),
                'user_id' => $id
            ]);
            $this->sendApiError(4006, 'Erreur lors de la suppression de l\'utilisateur', [
                'error' => $e->getMessage(),
                'user_id' => $id
            ]);
        }
    }
} 