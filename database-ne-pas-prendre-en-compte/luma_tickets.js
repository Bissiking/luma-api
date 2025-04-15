/**
 * Définition de la table de gestion des tickets
 */
module.exports = {
    'name': 'luma_tickets',
    'module': 'tickets',
    'description': 'Table de gestion des tickets',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'title': 'VARCHAR(255) NOT NULL',
        'description': 'TEXT NOT NULL',
        'status': 'ENUM("open", "in_progress", "resolved", "closed") NOT NULL DEFAULT "open"',
        'priority': 'ENUM("low", "medium", "high", "urgent") NOT NULL DEFAULT "medium"',
        'category_id': 'INT',
        'created_by': 'INT NOT NULL',
        'assigned_to': 'INT',
        'created_at': 'DATETIME NOT NULL',
        'updated_at': 'DATETIME NOT NULL',
        'closed_at': 'DATETIME'
    },
    'indexes': {
        'idx_status': 'status',
        'idx_priority': 'priority',
        'idx_category_id': 'category_id',
        'idx_created_by': 'created_by',
        'idx_assigned_to': 'assigned_to'
    },
    'foreign_keys': {
        'fk_category_id': {
            'columns': 'category_id',
            'reference_table': 'ticket_categories',
            'reference_columns': 'id'
        },
        'fk_created_by': {
            'columns': 'created_by',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        },
        'fk_assigned_to': {
            'columns': 'assigned_to',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        }
    }
}; 