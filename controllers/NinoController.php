<?php

namespace App\Api\Controllers;

use App\Core\Logger;

class NinoController extends BaseController
{
    /**
     * Récupère toutes les vidéos
     */
    public function getAllVideos()
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->query("
                SELECT v.*, c.name as category_name
                FROM luma_nino_videos v
                LEFT JOIN luma_nino_categories c ON v.category_id = c.id
                ORDER BY v.created_at DESC
            ");
            
            $videos = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            $this->sendSuccess($videos);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération des vidéos', [
                'error' => $e->getMessage()
            ]);
            $this->sendError('Erreur lors de la récupération des vidéos', 500);
        }
    }
    
    /**
     * Crée une nouvelle vidéo
     */
    public function createVideo()
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['title']) || !isset($data['url']) || !isset($data['category_id'])) {
                $this->sendError('Titre, URL et catégorie requis', 400);
            }
            
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("
                INSERT INTO luma_nino_videos (title, description, url, category_id, created_at)
                VALUES (:title, :description, :url, :category_id, NOW())
            ");
            
            $stmt->execute([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'url' => $data['url'],
                'category_id' => $data['category_id']
            ]);
            
            $videoId = $pdo->lastInsertId();
            
            $this->sendSuccess([
                'id' => $videoId,
                'message' => 'Vidéo créée avec succès'
            ]);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la création de la vidéo', [
                'error' => $e->getMessage()
            ]);
            $this->sendError('Erreur lors de la création de la vidéo', 500);
        }
    }
    
    /**
     * Récupère une vidéo spécifique
     */
    public function getVideo($id)
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("
                SELECT v.*, c.name as category_name
                FROM luma_nino_videos v
                LEFT JOIN luma_nino_categories c ON v.category_id = c.id
                WHERE v.id = :id
            ");
            
            $stmt->execute(['id' => $id]);
            $video = $stmt->fetch(\PDO::FETCH_ASSOC);
            
            if (!$video) {
                $this->sendError('Vidéo non trouvée', 404);
            }
            
            $this->sendSuccess($video);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération de la vidéo', [
                'error' => $e->getMessage(),
                'video_id' => $id
            ]);
            $this->sendError('Erreur lors de la récupération de la vidéo', 500);
        }
    }
    
    /**
     * Met à jour une vidéo
     */
    public function updateVideo($id)
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!isset($data['title']) && !isset($data['url']) && !isset($data['category_id'])) {
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
            
            if (isset($data['url'])) {
                $updates[] = "url = :url";
                $params['url'] = $data['url'];
            }
            
            if (isset($data['category_id'])) {
                $updates[] = "category_id = :category_id";
                $params['category_id'] = $data['category_id'];
            }
            
            $sql = "UPDATE luma_nino_videos SET " . implode(', ', $updates) . " WHERE id = :id";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Vidéo non trouvée', 404);
            }
            
            $this->sendSuccess(null, 'Vidéo mise à jour avec succès');
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la mise à jour de la vidéo', [
                'error' => $e->getMessage(),
                'video_id' => $id
            ]);
            $this->sendError('Erreur lors de la mise à jour de la vidéo', 500);
        }
    }
    
    /**
     * Supprime une vidéo
     */
    public function deleteVideo($id)
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->prepare("DELETE FROM luma_nino_videos WHERE id = :id");
            $stmt->execute(['id' => $id]);
            
            if ($stmt->rowCount() === 0) {
                $this->sendError('Vidéo non trouvée', 404);
            }
            
            $this->sendSuccess(null, 'Vidéo supprimée avec succès');
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la suppression de la vidéo', [
                'error' => $e->getMessage(),
                'video_id' => $id
            ]);
            $this->sendError('Erreur lors de la suppression de la vidéo', 500);
        }
    }
    
    /**
     * Récupère toutes les catégories
     */
    public function getAllCategories()
    {
        try {
            $db = new \App\Core\Database();
            $pdo = $db->getPdo();
            
            $stmt = $pdo->query("
                SELECT c.*, COUNT(v.id) as video_count
                FROM luma_nino_categories c
                LEFT JOIN luma_nino_videos v ON c.id = v.category_id
                GROUP BY c.id
                ORDER BY c.name ASC
            ");
            
            $categories = $stmt->fetchAll(\PDO::FETCH_ASSOC);
            
            $this->sendSuccess($categories);
        } catch (\Exception $e) {
            Logger::error('Erreur lors de la récupération des catégories', [
                'error' => $e->getMessage()
            ]);
            $this->sendError('Erreur lors de la récupération des catégories', 500);
        }
    }
} 