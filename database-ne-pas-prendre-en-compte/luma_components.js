/**
 * Définition de la table des composants
 */
module.exports = {
    'name': 'luma_components',
    'module': 'luma',
    'description': 'Table des versions des composants (frontend et API)',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'name': 'VARCHAR(50) NOT NULL UNIQUE',
        'type': 'ENUM("frontend", "api") NOT NULL',
        'current_version': 'VARCHAR(20) NOT NULL',
        'latest_version': 'VARCHAR(20)',
        'status': 'ENUM("up_to_date", "update_available", "update_required", "error") NOT NULL DEFAULT "up_to_date"',
        'last_check': 'DATETIME',
        'update_available_at': 'DATETIME',
        'update_required_at': 'DATETIME',
        'changelog': 'TEXT',
        'update_url': 'VARCHAR(255)',
        'error_message': 'TEXT',
        'auto_update': 'BOOLEAN NOT NULL DEFAULT FALSE',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_name': 'name',
        'idx_type': 'type',
        'idx_status': 'status',
        'idx_last_check': 'last_check'
    },
    'foreign_keys': {},
    'triggers': {
        'before_insert': 'SET NEW.created_at = NOW(), NEW.updated_at = NOW()',
        'before_update': 'SET NEW.updated_at = NOW()'
    }
}; 