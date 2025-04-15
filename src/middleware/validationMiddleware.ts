import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';

/**
 * Middleware de validation pour l'inscription
 */
export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
  // Schéma de validation
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).required()
      .messages({
        'string.base': 'Le nom d\'utilisateur doit être une chaîne de caractères',
        'string.empty': 'Le nom d\'utilisateur est requis',
        'string.min': 'Le nom d\'utilisateur doit contenir au moins {#limit} caractères',
        'string.max': 'Le nom d\'utilisateur doit contenir au maximum {#limit} caractères',
        'any.required': 'Le nom d\'utilisateur est requis'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.base': 'L\'email doit être une chaîne de caractères',
        'string.empty': 'L\'email est requis',
        'string.email': 'L\'email doit être valide',
        'any.required': 'L\'email est requis'
      }),
    password: Joi.string().min(8).required()
      .messages({
        'string.base': 'Le mot de passe doit être une chaîne de caractères',
        'string.empty': 'Le mot de passe est requis',
        'string.min': 'Le mot de passe doit contenir au moins {#limit} caractères',
        'any.required': 'Le mot de passe est requis'
      }),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({
        'any.only': 'Les mots de passe ne correspondent pas',
        'any.required': 'La confirmation du mot de passe est requise'
      })
  });

  // Valider les données
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn(`Validation échouée pour l'inscription: ${errorMessages.join(', ')}`);
    res.status(400).json({ message: 'Validation échouée', errors: errorMessages });
    return;
  }

  next();
};

/**
 * Middleware de validation pour la connexion
 */
export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  // Schéma de validation
  const schema = Joi.object({
    username: Joi.string().required()
      .messages({
        'string.base': 'Le nom d\'utilisateur doit être une chaîne de caractères',
        'string.empty': 'Le nom d\'utilisateur est requis',
        'any.required': 'Le nom d\'utilisateur est requis'
      }),
    password: Joi.string().required()
      .messages({
        'string.base': 'Le mot de passe doit être une chaîne de caractères',
        'string.empty': 'Le mot de passe est requis',
        'any.required': 'Le mot de passe est requis'
      }),
    remember_me: Joi.boolean().optional()
      .messages({
        'boolean.base': 'Le champ remember_me doit être un booléen'
      })
  });

  // Valider les données
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    logger.warn(`Validation échouée pour la connexion: ${errorMessages.join(', ')}`);
    res.status(400).json({ message: 'Validation échouée', errors: errorMessages });
    return;
  }

  next();
}; 