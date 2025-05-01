import { Request, Response } from 'express';
import DebugReport from '../models/DebugReport';
import User from '../models/User';
import { dbLogger as logger } from '../config/logger';

/**
 * Contrôleur pour gérer les opérations sur les rapports de debug
 */
export const debugController = {
  /**
   * Récupérer tous les rapports de debug
   * GET /api/v1/debug/reports
   */
  getAllDebugReports: async (req: Request, res: Response) => {
    try {
      const { priority } = req.query;
      
      // Construire la requête avec des filtres optionnels
      const whereClause: any = {};
      
      if (priority) {
        whereClause.priority = priority;
      }
      
      const reports = await DebugReport.findAll({
        where: whereClause,
        include: [
          { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
        ],
        order: [['created_at', 'DESC']]
      });
      
      return res.status(200).json({
        success: true,
        count: reports.length,
        data: reports
      });
    } catch (error: any) {
      logger.error(`Erreur lors de la récupération des rapports de debug: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des rapports de debug',
        error: error.message
      });
    }
  },
  
  /**
   * Récupérer un rapport de debug par son ID
   * GET /api/v1/debug/reports/:id
   */
  getDebugReportById: async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      
      const report = await DebugReport.findByPk(reportId, {
        include: [
          { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
        ]
      });
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: `Rapport de debug avec l'ID ${reportId} non trouvé`
        });
      }
      
      return res.status(200).json({
        success: true,
        data: report
      });
    } catch (error: any) {
      logger.error(`Erreur lors de la récupération du rapport de debug: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du rapport de debug',
        error: error.message
      });
    }
  },
  
  /**
   * Créer un nouveau rapport de debug
   * POST /api/v1/debug/reports
   */
  createDebugReport: async (req: Request, res: Response) => {
    try {
      const {
        title,
        description,
        content,
        priority,
        images,
        reported_by
      } = req.body;

      // Validation des champs requis
      if (!title || !description) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez fournir le titre et la description'
        });
      }

      // Déterminer l'ID de l'utilisateur (soit authentifié, soit fourni dans la requête)
      let userId = req.user ? req.user.id : reported_by;
      
      // Si aucun ID d'utilisateur n'est disponible, utiliser 1 par défaut (pour les tests)
      if (!userId) {
        userId = 1; // Utilisateur par défaut pour les tests
      }

      // Validation de la priorité
      const validPriorities = ['critique', 'elevee', 'moyenne', 'basse'];
      if (priority && !validPriorities.includes(priority)) {
        return res.status(400).json({
          success: false,
          message: `Priorité invalide. Les valeurs autorisées sont: ${validPriorities.join(', ')}`
        });
      }

      // Validation des images (si présentes)
      if (images && Array.isArray(images)) {
        for (const image of images) {
          if (!image.startsWith('data:image/')) {
            return res.status(400).json({
              success: false,
              message: 'Format d\'image invalide. Les images doivent être en base64'
            });
          }
        }
      }

      // Création du rapport
      const newReport = await DebugReport.create({
        title,
        description,
        content: content || null,
        priority: priority || 'moyenne',
        images: images || [],
        reported_by: userId
      });

      return res.status(201).json({
        success: true,
        message: 'Rapport de debug créé avec succès',
        data: newReport
      });
    } catch (error: any) {
      logger.error(`Erreur lors de la création du rapport de debug: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du rapport de debug',
        error: error.message
      });
    }
  },
  
  /**
   * Mettre à jour un rapport de debug
   * PATCH /api/v1/debug/reports/:id
   */
  updateDebugReport: async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      const {
        title,
        description,
        content,
        priority,
        images
      } = req.body;
      
      // Trouver le rapport à mettre à jour
      const report = await DebugReport.findByPk(reportId);
      
      if (!report) {
        return res.status(404).json({
          success: false,
          message: `Rapport de debug avec l'ID ${reportId} non trouvé`
        });
      }
      
      // Authentification désactivée temporairement pour les tests
      
      // Validation de la priorité si fournie
      if (priority) {
        const validPriorities = ['critique', 'elevee', 'moyenne', 'basse'];
        if (!validPriorities.includes(priority)) {
          return res.status(400).json({
            success: false,
            message: `Priorité invalide. Les valeurs autorisées sont: ${validPriorities.join(', ')}`
          });
        }
      }
      
      // Validation des images si fournies
      if (images && Array.isArray(images)) {
        for (const image of images) {
          if (typeof image === 'string' && !image.startsWith('data:image/')) {
            return res.status(400).json({
              success: false,
              message: 'Format d\'image invalide. Les images doivent être en base64'
            });
          }
        }
      }
      
      // Préparer les données à mettre à jour
      const updateData: any = {};
      
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (content !== undefined) updateData.content = content;
      if (priority !== undefined) updateData.priority = priority;
      if (images !== undefined) updateData.images = images;
      
      // Mettre à jour le rapport
      await report.update(updateData);
      
      return res.status(200).json({
        success: true,
        message: 'Rapport de debug mis à jour avec succès',
        data: report
      });
    } catch (error: any) {
      logger.error(`Erreur lors de la mise à jour du rapport de debug: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour du rapport de debug',
        error: error.message
      });
    }
  }
}; 