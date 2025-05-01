import { Request, Response } from 'express';
import { Op } from 'sequelize';
import Bug from '../models/Bug';
import User from '../models/User';
import { dbLogger as logger } from '../config/logger';
import { ensureRequiredFields } from '../utils/dataTransformer';

/**
 * Contrôleur pour gérer les opérations sur les bugs
 */
export const bugController = {
  /**
   * Récupérer tous les bugs
   * GET /api/bugs
   */
  getAllBugs: async (req: Request, res: Response) => {
    try {
      const { status, priority, assignee } = req.query;
      
      // Construire la requête avec des filtres optionnels
      const whereClause: any = {};
      
      if (status) {
        whereClause.status = status;
      }
      
      if (priority) {
        whereClause.priority = priority;
      }
      
      if (assignee) {
        whereClause.assigned_to = assignee;
      }
      
      // Récupérer les bugs depuis la base de données
      const bugs = await Bug.findAll({
        where: whereClause,
        attributes: [
          'id', 'title', 'description', 'content', 'status', 'priority',
          'component_id', 'reported_by', 'assigned_to', 'created_at', 'updated_at', 'resolved_at',
          'images'
        ],
        include: [
          { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
        ],
        order: [['updated_at', 'DESC']]
      });
      
      // Transformer manuellement les bugs pour s'assurer de la présence du status
      const transformedBugs = bugs.map(bug => {
        // Conversion en objet simple
        const plainBug = {
          id: bug.get('id'),
          title: bug.get('title'),
          description: bug.get('description'),
          content: bug.get('content'),
          status: bug.get('status') || 'nouveau', // Forcer la valeur par défaut
          priority: bug.get('priority') || 'moyenne',
          component_id: bug.get('component_id'),
          reported_by: bug.get('reported_by'),
          assigned_to: bug.get('assigned_to'),
          created_at: bug.get('created_at'),
          updated_at: bug.get('updated_at'),
          resolved_at: bug.get('resolved_at'),
          images: bug.get('images') || [],
          reporter: bug.get('reporter'),
          assignee: bug.get('assignee')
        };
        
        return plainBug;
      });
      
      return res.status(200).json({
        success: true,
        count: transformedBugs.length,
        data: transformedBugs
      });
    } catch (error: any) {
      logger.error(`Erreur lors de la récupération des bugs: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération des bugs',
        error: error.message
      });
    }
  },
  
  /**
   * Récupérer un bug par son ID
   * GET /api/bugs/:id
   */
  getBugById: async (req: Request, res: Response) => {
    try {
      const bugId = parseInt(req.params.id);
      
      const bug = await Bug.findByPk(bugId, {
        attributes: [
          'id', 'title', 'description', 'content', 'status', 'priority',
          'component_id', 'reported_by', 'assigned_to', 'created_at', 'updated_at', 'resolved_at',
          'images'
        ],
        include: [
          { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
        ]
      });
      
      if (!bug) {
        return res.status(404).json({
          success: false,
          message: `Bug avec l'ID ${bugId} non trouvé`
        });
      }
      
      // Transformer manuellement le bug pour s'assurer de la présence du status
      const transformedBug = {
        id: bug.get('id'),
        title: bug.get('title'),
        description: bug.get('description'),
        content: bug.get('content'),
        status: bug.get('status') || 'nouveau', // Forcer la valeur par défaut
        priority: bug.get('priority') || 'moyenne',
        component_id: bug.get('component_id'),
        reported_by: bug.get('reported_by'),
        assigned_to: bug.get('assigned_to'),
        created_at: bug.get('created_at'),
        updated_at: bug.get('updated_at'),
        resolved_at: bug.get('resolved_at'),
        images: bug.get('images') || [],
        reporter: bug.get('reporter'),
        assignee: bug.get('assignee')
      };
      
      return res.status(200).json({
        success: true,
        data: transformedBug
      });
    } catch (error: any) {
      logger.error(`Erreur lors de la récupération du bug: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la récupération du bug',
        error: error.message
      });
    }
  },
  
  /**
   * Créer un nouveau bug
   * POST /api/bugs
   */
  createBug: async (req: Request, res: Response) => {
    try {
      const {
        title,
        description,
        content,
        priority,
        component_id,
        reported_by,
        assigned_to,
        images
      } = req.body;
      
      // Validation des champs requis
      if (!title || !description || !reported_by) {
        return res.status(400).json({
          success: false,
          message: 'Veuillez fournir le titre, la description et l\'identifiant du rapporteur'
        });
      }
      
      // Vérifier si l'utilisateur rapporteur existe
      const reporter = await User.findByPk(reported_by);
      if (!reporter) {
        return res.status(404).json({
          success: false,
          message: `Utilisateur avec l'ID ${reported_by} non trouvé`
        });
      }
      
      // Vérifier l'utilisateur assigné si fourni
      if (assigned_to) {
        const assignee = await User.findByPk(assigned_to);
        if (!assignee) {
          return res.status(404).json({
            success: false,
            message: `Utilisateur assigné avec l'ID ${assigned_to} non trouvé`
          });
        }
      }
      
      // Création du bug
      const newBug = await Bug.create({
        title,
        description,
        content,
        status: 'nouveau',
        priority: priority || 'moyenne',
        component_id,
        reported_by,
        assigned_to,
        images: images || []
      });
      
      // Récupérer le bug créé avec toutes ses associations
      const createdBug = await Bug.findByPk(newBug.id, {
        include: [
          { model: User, as: 'reporter', attributes: ['id', 'username', 'email'] },
          { model: User, as: 'assignee', attributes: ['id', 'username', 'email'] }
        ]
      });
      
      // Transformer manuellement le bug pour s'assurer de la présence du status
      const transformedBug = {
        id: createdBug?.get('id'),
        title: createdBug?.get('title'),
        description: createdBug?.get('description'),
        content: createdBug?.get('content'),
        status: createdBug?.get('status') || 'nouveau', // Forcer la valeur par défaut
        priority: createdBug?.get('priority') || 'moyenne',
        component_id: createdBug?.get('component_id'),
        reported_by: createdBug?.get('reported_by'),
        assigned_to: createdBug?.get('assigned_to'),
        created_at: createdBug?.get('created_at'),
        updated_at: createdBug?.get('updated_at'),
        resolved_at: createdBug?.get('resolved_at'),
        images: createdBug?.get('images') || [],
        reporter: createdBug?.get('reporter'),
        assignee: createdBug?.get('assignee')
      };
      
      return res.status(201).json({
        success: true,
        message: 'Bug créé avec succès',
        data: transformedBug
      });
    } catch (error: any) {
      logger.error(`Erreur lors de la création du bug: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la création du bug',
        error: error.message
      });
    }
  }
}; 