/**
 * Définition de la table des agents de monitoring
 */
module.exports = {
    'name': 'monitoring_agents',
    'module': 'monitoring',
    'description': 'Table des agents de monitoring',
    'version': '1.0.1',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'user_id': 'INT',
        'name': 'VARCHAR(100) NOT NULL',
        'description': 'TEXT',
        'type': 'VARCHAR(50) NOT NULL DEFAULT "server"',
        'uuid': 'VARCHAR(36) NOT NULL UNIQUE',
        'token': 'VARCHAR(255) NOT NULL UNIQUE',
        'status': 'VARCHAR(50) NOT NULL DEFAULT "inactive"',
        'is_public': 'BOOLEAN NOT NULL DEFAULT FALSE',
        'last_check_in': 'DATETIME NULL',
        'ip_address': 'VARCHAR(45)',
        'version': 'VARCHAR(50)',
        'created_at': 'DATETIME NOT NULL',
        'updated_at': 'DATETIME'
    },
    'indexes': {
        'idx_user_id': 'user_id',
        'idx_uuid': 'uuid',
        'idx_token': 'token',
        'idx_status': 'status'
    },
    'foreign_keys': {
        'fk_monitoring_agents_user': {
            'columns': 'user_id',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        }
    },
    'triggers': {
        'before_insert': 'SET NEW.created_at = NOW(), NEW.updated_at = NOW()',
        'before_update': 'SET NEW.updated_at = NOW()'
    }
}; 