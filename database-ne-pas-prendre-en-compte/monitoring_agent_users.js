/**
 * Définition de la table d'association entre les agents de monitoring et les utilisateurs autorisés
 */
module.exports = {
    'name': 'monitoring_agent_users',
    'module': 'monitoring',
    'description': 'Table d\'association entre les agents de monitoring et les utilisateurs autorisés',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'agent_id': 'INT NOT NULL',
        'user_id': 'INT NOT NULL',
        'role': 'ENUM("viewer", "editor", "admin") NOT NULL DEFAULT "viewer"',
        'created_at': 'DATETIME NOT NULL',
        'updated_at': 'DATETIME NOT NULL'
    },
    'indexes': {
        'idx_agent_id': 'agent_id',
        'idx_user_id': 'user_id',
        'idx_agent_user': ['agent_id', 'user_id']
    },
    'foreign_keys': {
        'fk_monitoring_agent_users_agent': {
            'columns': 'agent_id',
            'reference_table': 'monitoring_agents',
            'reference_columns': 'id'
        },
        'fk_monitoring_agent_users_user': {
            'columns': 'user_id',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        }
    },
    'constraints': {
        'unique_agent_user': 'UNIQUE (agent_id, user_id)'
    },
    'triggers': {
        'before_insert': 'SET NEW.created_at = NOW(), NEW.updated_at = NOW()',
        'before_update': 'SET NEW.updated_at = NOW()'
    }
}; 