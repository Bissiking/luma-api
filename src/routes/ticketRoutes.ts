import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import Ticket from '../models/Ticket';
import TicketCategory from '../models/TicketCategory';
import TicketComment from '../models/TicketComment';
import TicketHistory from '../models/TicketHistory';
import TicketEscalation from '../models/TicketEscalation';
import { logger } from '../config/logger';
import sequelize from '../config/db';
import User from '../models/User';
import { Op } from 'sequelize';

const router = Router();

// Route pour obtenir la liste des tickets avec pagination et tri
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortField = (req.query.sort_field as string) || 'created_at';
    const sortOrder = (req.query.sort_order as string) || 'desc';
    const offset = (page - 1) * limit;

    // Filtres
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const category = req.query.category as string;
    const creator = req.query.creator as string;
    const search = req.query.search as string;

    // Construction des conditions WHERE
    const whereConditions: any = {};
    
    // Filtre par statut
    if (status && status !== 'all') {
      logger.debug(`Filtrage par statut: ${status}`);
      whereConditions.status = {
        [Op.eq]: status
      };
    }

    // Filtre par priorité
    if (priority && priority !== 'all') {
      logger.debug(`Filtrage par priorité: ${priority}`);
      whereConditions.priority = {
        [Op.eq]: priority
      };
    }

    // Filtre par catégorie
    if (category && category !== 'all' && !isNaN(parseInt(category))) {
      logger.debug(`Filtrage par catégorie: ${category}`);
      whereConditions.category_id = {
        [Op.eq]: parseInt(category)
      };
    }

    // Filtre par créateur
    if (creator && creator !== 'all' && !isNaN(parseInt(creator))) {
      logger.debug(`Filtrage par créateur: ${creator}`);
      whereConditions.created_by = {
        [Op.eq]: parseInt(creator)
      };
    }

    // Recherche textuelle
    if (search && search.trim() !== '') {
      logger.debug(`Recherche textuelle: ${search}`);
      whereConditions[Op.or] = [
        { 
          title: {
            [Op.like]: `%${search.trim()}%`
          }
        },
        { 
          description: {
            [Op.like]: `%${search.trim()}%`
          }
        }
      ];
    }

    logger.debug('Conditions WHERE finales:', JSON.stringify(whereConditions, null, 2));

    // Vérifier que le champ de tri est valide
    const validSortFields = ['created_at', 'updated_at', 'status', 'priority', 'title'];
    if (!validSortFields.includes(sortField)) {
      return res.status(400).json({
        success: false,
        message: 'Champ de tri invalide',
        details: `Les champs de tri valides sont: ${validSortFields.join(', ')}`
      });
    }

    // Vérifier que l'ordre de tri est valide
    const validSortOrders = ['asc', 'desc'];
    if (!validSortOrders.includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: 'Ordre de tri invalide',
        details: 'Les ordres de tri valides sont: asc, desc'
      });
    }

    const { count, rows: tickets } = await Ticket.findAndCountAll({
      where: whereConditions,
      limit,
      offset,
      order: [[sortField, sortOrder]],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email']
        },
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'color', 'icon']
        }
      ],
      distinct: true // Pour éviter les doublons dus aux jointures
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      success: true,
      message: 'Tickets récupérés avec succès',
      data: {
        tickets,
        filters: {
          status: status || null,
          priority: priority || null,
          category: category || null,
          creator: creator || null
        },
        pagination: {
          total: count,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des tickets: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tickets',
      error: error.message
    });
  }
});

// Route pour obtenir les statistiques des tickets d'un utilisateur
router.get('/stats/user/:userId', protect, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const stats = await Ticket.findAll({
      where: { user_id: userId },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      message: 'Statistiques des tickets récupérées avec succès',
      stats
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des statistiques: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des statistiques',
      error: error.message
    });
  }
});

// Route pour obtenir toutes les catégories de tickets
router.get('/categories', protect, async (req, res) => {
  try {
    const categories = await TicketCategory.findAll({
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      message: 'Catégories récupérées avec succès',
      categories
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des catégories: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des catégories',
      error: error.message
    });
  }
});

// Créer un nouveau ticket
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, category_id, priority } = req.body;

    // Validation des champs requis
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        error: 'Le titre et la description sont requis'
      });
    }

    // Validation de la priorité
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        success: false,
        error: 'Priorité invalide',
        validPriorities
      });
    }

    // Vérification de la catégorie si fournie
    if (category_id) {
      const category = await TicketCategory.findByPk(category_id);
      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'Catégorie invalide'
        });
      }
    }

    // Création du ticket
    const ticket = await Ticket.create({
      title,
      description,
      category_id: category_id || null,
      priority: priority || 'medium',
      status: 'open',
      created_by: req.user.id, // L'utilisateur connecté est le créateur
      created_at: new Date(),
      updated_at: new Date()
    });

    // Récupération du ticket créé avec ses relations
    const ticketWithRelations = await Ticket.findByPk(ticket.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'color', 'icon']
        }
      ]
    });

    res.status(201).json({
      success: true,
      data: ticketWithRelations
    });
  } catch (error) {
    console.error('Erreur lors de la création du ticket:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du ticket'
    });
  }
});

// Obtenir un ticket spécifique
router.get('/:id', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const ticket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email']
        },
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'color', 'icon']
        }
      ]
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération du ticket: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du ticket',
      error: error.message
    });
  }
});

// Obtenir les commentaires d'un ticket
router.get('/:id/comments', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    const comments = await TicketComment.findAll({
      where: { ticket_id: ticketId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: comments
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des commentaires: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commentaires',
      error: error.message
    });
  }
});

// Obtenir l'historique d'un ticket
router.get('/:id/history', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    const history = await TicketHistory.findAll({
      where: { ticket_id: ticketId },
      include: [
        {
          model: User,
          as: 'performer',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['performed_at', 'DESC']]
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'historique',
      error: error.message
    });
  }
});

// Obtenir les escalades d'un ticket
router.get('/:id/escalations', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    const escalations = await TicketEscalation.findAll({
      where: { ticket_id: ticketId },
      include: [
        {
          model: User,
          as: 'escalator',
          attributes: ['id', 'username', 'email']
        },
        {
          model: User,
          as: 'handler',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: escalations
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la récupération des escalades: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des escalades',
      error: error.message
    });
  }
});

// Ajouter un commentaire à un ticket
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { content, is_internal } = req.body;
    const userId = req.user.id;

    // Validation des champs
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du commentaire est requis'
      });
    }

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Créer le commentaire
    const newComment = await TicketComment.create({
      ticket_id: ticketId,
      user_id: userId,
      content: content.trim(),
      is_internal: is_internal === true
    });

    // Récupérer le commentaire avec les infos de l'utilisateur
    const commentWithUser = await TicketComment.findByPk(newComment.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'name']
        }
      ]
    });

    // Ajouter une entrée dans l'historique du ticket
    await TicketHistory.create({
      ticket_id: ticketId,
      performed_by: userId,
      action: 'comment_added',
      details: `Commentaire ${is_internal ? 'interne' : 'public'} ajouté`,
      new_value: content.trim()
    });

    // Retourner le commentaire créé
    res.status(201).json({
      success: true,
      message: 'Commentaire ajouté avec succès',
      data: commentWithUser
    });
  } catch (error: any) {
    logger.error(`Erreur lors de l'ajout du commentaire: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du commentaire',
      error: error.message
    });
  }
});

// Prendre en charge un ticket
router.post('/:id/take-charge', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.id;

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Vérifier si le ticket n'est pas déjà pris en charge par l'utilisateur
    if (ticket.assigned_to === userId) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà pris en charge ce ticket'
      });
    }

    // Sauvegarder l'ancienne valeur pour l'historique
    const oldAssignee = ticket.assigned_to;

    // Mettre à jour le ticket
    await ticket.update({
      assigned_to: userId,
      status: 'in_progress',
      updated_at: new Date()
    });

    // Ajouter une entrée dans l'historique
    await TicketHistory.create({
      ticket_id: ticketId,
      performed_by: userId,
      action: 'take_charge',
      details: 'Ticket pris en charge',
      old_value: oldAssignee ? oldAssignee.toString() : null,
      new_value: userId.toString(),
      performed_at: new Date()
    });

    // Récupérer le ticket mis à jour avec toutes ses relations
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'color', 'icon']
        }
      ]
    });

    // Ajouter un commentaire automatique
    await TicketComment.create({
      ticket_id: ticketId,
      user_id: userId,
      content: 'Ticket pris en charge',
      is_internal: true,
      created_at: new Date()
    });

    res.json({
      success: true,
      message: 'Ticket pris en charge avec succès',
      data: updatedTicket
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la prise en charge du ticket: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la prise en charge du ticket',
      error: error.message
    });
  }
});

// Assigner un ticket à un utilisateur
router.post('/:id/assign', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const { user_id } = req.body;
    const assignedBy = req.user.id;

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Vérifier si l'utilisateur assigné existe
    const assignedUser = await User.findByPk(user_id);
    if (!assignedUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur assigné non trouvé'
      });
    }

    // Sauvegarder l'ancienne valeur pour l'historique
    const oldAssignee = ticket.assigned_to;

    // Mettre à jour le ticket
    await ticket.update({
      assigned_to: user_id,
      status: 'in_progress',
      updated_at: new Date()
    });

    // Ajouter une entrée dans l'historique
    await TicketHistory.create({
      ticket_id: ticketId,
      performed_by: assignedBy,
      action: 'assign',
      details: `Ticket assigné à ${assignedUser.username}`,
      old_value: oldAssignee ? oldAssignee.toString() : null,
      new_value: user_id.toString(),
      performed_at: new Date()
    });

    // Récupérer le ticket mis à jour avec toutes ses relations
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'color', 'icon']
        }
      ]
    });

    // Ajouter un commentaire automatique
    await TicketComment.create({
      ticket_id: ticketId,
      user_id: assignedBy,
      content: `Ticket assigné à ${assignedUser.username}`,
      is_internal: true,
      created_at: new Date()
    });

    res.json({
      success: true,
      message: 'Ticket assigné avec succès',
      data: updatedTicket
    });
  } catch (error: any) {
    logger.error(`Erreur lors de l'assignation du ticket: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'assignation du ticket',
      error: error.message
    });
  }
});

// Résoudre un ticket
router.post('/:id/resolve', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.id;
    const { resolution_note } = req.body;

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Vérifier si le ticket peut être résolu (n'est pas déjà fermé)
    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Impossible de résoudre un ticket fermé'
      });
    }

    // Sauvegarder l'ancien statut pour l'historique
    const oldStatus = ticket.status;

    // Mettre à jour le ticket
    await ticket.update({
      status: 'resolved',
      updated_at: new Date()
    });

    // Ajouter une entrée dans l'historique
    await TicketHistory.create({
      ticket_id: ticketId,
      performed_by: userId,
      action: 'resolve',
      details: 'Ticket résolu',
      old_value: oldStatus,
      new_value: 'resolved',
      performed_at: new Date()
    });

    // Ajouter un commentaire avec la note de résolution si fournie
    if (resolution_note) {
      await TicketComment.create({
        ticket_id: ticketId,
        user_id: userId,
        content: `Résolution : ${resolution_note}`,
        is_internal: true,
        created_at: new Date()
      });
    }

    // Récupérer le ticket mis à jour avec toutes ses relations
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'color', 'icon']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Ticket résolu avec succès',
      data: updatedTicket
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la résolution du ticket: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la résolution du ticket',
      error: error.message
    });
  }
});

// Fermer un ticket
router.post('/:id/close', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const userId = req.user.id;
    const { closing_note } = req.body;

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Vérifier si le ticket peut être fermé (est résolu)
    if (ticket.status !== 'resolved') {
      return res.status(400).json({
        success: false,
        message: 'Le ticket doit être résolu avant de pouvoir être fermé'
      });
    }

    // Sauvegarder l'ancien statut pour l'historique
    const oldStatus = ticket.status;

    // Mettre à jour le ticket
    await ticket.update({
      status: 'closed',
      updated_at: new Date(),
      closed_at: new Date()
    });

    // Ajouter une entrée dans l'historique
    await TicketHistory.create({
      ticket_id: ticketId,
      performed_by: userId,
      action: 'close',
      details: 'Ticket fermé',
      old_value: oldStatus,
      new_value: 'closed',
      performed_at: new Date()
    });

    // Ajouter un commentaire avec la note de fermeture si fournie
    if (closing_note) {
      await TicketComment.create({
        ticket_id: ticketId,
        user_id: userId,
        content: `Fermeture : ${closing_note}`,
        is_internal: true,
        created_at: new Date()
      });
    }

    // Récupérer le ticket mis à jour avec toutes ses relations
    const updatedTicket = await Ticket.findByPk(ticketId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: TicketCategory,
          as: 'category',
          attributes: ['id', 'name', 'description', 'color', 'icon']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Ticket fermé avec succès',
      data: updatedTicket
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la fermeture du ticket: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la fermeture du ticket',
      error: error.message
    });
  }
});

// Créer une escalade pour un ticket
router.post('/:id/escalations', protect, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id);
    const escalatedBy = req.user.id;
    const { escalated_to, reason } = req.body;

    // Validation des champs requis
    if (!escalated_to || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Le destinataire et la raison de l\'escalade sont requis'
      });
    }

    // Vérifier si le ticket existe
    const ticket = await Ticket.findByPk(ticketId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket non trouvé'
      });
    }

    // Vérifier si l'utilisateur destinataire existe
    const targetUser = await User.findByPk(escalated_to);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur destinataire non trouvé'
      });
    }

    // Créer l'escalade
    const escalation = await TicketEscalation.create({
      ticket_id: ticketId,
      escalated_to,
      escalation_reason: reason,
      escalated_at: new Date()
    });

    // Ajouter une entrée dans l'historique
    await TicketHistory.create({
      ticket_id: ticketId,
      performed_by: escalatedBy,
      action: 'escalate',
      details: `Ticket escaladé à ${targetUser.username}`,
      new_value: escalated_to.toString(),
      performed_at: new Date()
    });

    // Ajouter un commentaire automatique
    await TicketComment.create({
      ticket_id: ticketId,
      user_id: escalatedBy,
      content: `Ticket escaladé à ${targetUser.username}\nRaison : ${reason}`,
      is_internal: true,
      created_at: new Date()
    });

    // Switch le statut du ticket à escalade
    await ticket.update({
      status: 'escalated',
      updated_at: new Date()
    });

    // Récupérer l'escalade avec les relations
    const escalationWithRelations = await TicketEscalation.findByPk(escalation.id, {
      include: [
        {
          model: User,
          as: 'assignedTo',
          attributes: ['id', 'username', 'email', 'name']
        },
        {
          model: Ticket,
          as: 'ticket',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'username', 'email', 'name']
            },
            {
              model: User,
              as: 'assignee',
              attributes: ['id', 'username', 'email', 'name']
            },
            {
              model: TicketCategory,
              as: 'category',
              attributes: ['id', 'name', 'description', 'color', 'icon']
            }
          ]
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Escalade créée avec succès',
      data: escalationWithRelations
    });
  } catch (error: any) {
    logger.error(`Erreur lors de la création de l'escalade: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'escalade',
      error: error.message
    });
  }
});

export default router;