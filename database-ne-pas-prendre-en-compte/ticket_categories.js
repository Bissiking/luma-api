/**
 * Définition de la table des catégories de tickets
 */
module.exports = {
    'name': 'ticket_categories',
    'module': 'tickets',
    'description': 'Table des catégories de tickets',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'name': 'VARCHAR(100) NOT NULL',
        'description': 'TEXT',
        'color': 'VARCHAR(20) NOT NULL DEFAULT "#3b82f6"',
        'icon': 'VARCHAR(50)',
        'is_active': 'BOOLEAN NOT NULL DEFAULT 1',
        'created_at': 'DATETIME NOT NULL',
        'updated_at': 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_name': 'name',
        'idx_is_active': 'is_active'
    },
    'foreign_keys': {}
}; 