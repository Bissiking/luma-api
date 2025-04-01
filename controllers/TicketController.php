<?php

namespace App\Api\Controllers;

use App\Core\Logger;

class TicketController extends BaseController
{
    /**
     * Crée un nouveau ticket
     */
    public function create()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['title']) || !isset($data['description'])) {
                $this->sendError('Le titre et la description sont requis', 400);
            }
            
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("
                INSERT INTO luma_tickets (title, description, status, priority, created_by, created_at)
                VALUES (:title, :description, :status, :priority, :created_by, NOW())
            ");
            
            $stmt->execute([
                'title' => $data['title'],
                'description' => $data['description'],
                'status' => $data['status'] ?? 'open',
                'priority' => $data['priority'] ?? 'medium',
                'created_by' => $_SESSION['user']['id'] ?? null
            ]);
            
            $ticketId = $pdo->lastInsertId();
            
            $this->sendSuccess([
                'id' => $ticketId,
                'message' => 'Ticket créé avec succès'
            ]);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la création du ticket', [
                'error' => $e->getMessage()
            ]);
            $this->sendError('Erreur lors de la création du ticket', 500);
        }
    }
    
    /**
     * Liste tous les tickets
     */
    public function index()
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->query("
                SELECT t.*, u.username as created_by_name
                FROM luma_tickets t
                LEFT JOIN luma_users u ON t.created_by = u.id
                ORDER BY t.created_at DESC
            ");
            
            $tickets = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            $this->sendSuccess($tickets);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération des tickets', [
                'error' => $e->getMessage()
            ]);
            $this->sendError('Erreur lors de la récupération des tickets', 500);
        }
    }
    
    /**
     * Affiche un ticket spécifique
     */
    public function show($id)
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("
                SELECT t.*, u.username as created_by_name
                FROM luma_tickets t
                LEFT JOIN luma_users u ON t.created_by = u.id
                WHERE t.id = :id
            ");
            
            $stmt->execute(['id' => $id]);
            $ticket = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$ticket) {
                $this->sendError('Ticket non trouvé', 404);
            }
            
            $this->sendSuccess($ticket);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération du ticket', [
                'error' => $e->getMessage(),
                'ticket_id' => $id
            ]);
            $this->sendError('Erreur lors de la récupération du ticket', 500);
        }
    }
    
    /**
     * Met à jour un ticket
     */
    public function update($id)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['title']) && !isset($data['description']) && !isset($data['status'])) {
                $this->sendError('Aucune donnée à mettre à jour', 400);
            }
            
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $updates = [];
            $params = ['id' => $id];
            
            if (isset($data['title'])) {
                $updates[] = "title = :title";
                $params['title'] = $data['title'];
            }
            
            if (isset($data['description'])) {
                $updates[] = "description = :description";
                $params['description'] = $data['description'];
            }
            
            if (isset($data['status'])) {
                $updates[] = "status = :status";
                $params['status'] = $data['status'];
            }
            
            if (isset($data['priority'])) {
                $updates[] = "priority = :priority";
                $params['priority'] = $data['priority'];
            }
            
            $sql = "UPDATE luma_tickets SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Ticket non trouvé', 404);
            }
            
            $this->sendSuccess(null, 'Ticket mis à jour avec succès');
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la mise à jour du ticket', [
                'error' => $e->getMessage(),
                'ticket_id' => $id
            ]);
            $this->sendError('Erreur lors de la mise à jour du ticket', 500);
        }
    }
    
    /**
     * Supprime un ticket
     */
    public function destroy($id)
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("DELETE FROM luma_tickets WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Ticket non trouvé', 404);
            }
            
            $this->sendSuccess(null, 'Ticket supprimé avec succès');
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la suppression du ticket', [
                'error' => $e->getMessage(),
                'ticket_id' => $id
            ]);
            $this->sendError('Erreur lors de la suppression du ticket', 500);
        }
    }
} 