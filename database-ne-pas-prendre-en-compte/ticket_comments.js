/**
 * Définition de la table des commentaires des tickets
 */
module.exports = {
    'name': 'ticket_comments',
    'module': 'tickets',
    'description': 'Table des commentaires des tickets',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'ticket_id': 'INT NOT NULL',
        'user_id': 'INT',
        'content': 'TEXT NOT NULL',
        'is_internal': 'BOOLEAN NOT NULL DEFAULT 0',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_ticket_id': 'ticket_id',
        'idx_user_id': 'user_id',
        'idx_is_internal': 'is_internal'
    },
    'foreign_keys': {
        'fk_ticket_comments_ticket_id': {
            'columns': 'ticket_id',
            'reference_table': 'luma_tickets',
            'reference_columns': 'id'
        },
        'fk_ticket_comments_user_id': {
            'columns': 'user_id',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        }
    }
}; 