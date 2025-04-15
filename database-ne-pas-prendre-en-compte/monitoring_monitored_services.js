/**
 * Définition de la table des services autorisés à être supervisés
 */
module.exports = {
    'name': 'monitoring_monitored_services',
    'module': 'monitoring',
    'description': 'Table des services autorisés à être supervisés',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'agent_id': 'INT NOT NULL',
        'service_type': 'ENUM("windows", "linux", "docker") NOT NULL',
        'service_name': 'VARCHAR(255) NOT NULL',
        'service_id': 'VARCHAR(255)',
        'is_monitored': 'BOOLEAN NOT NULL DEFAULT 1',
        'config': 'JSON',
        'last_check': 'DATETIME',
        'status': 'ENUM("active", "inactive", "error") NOT NULL DEFAULT "active"',
        'error_message': 'TEXT',
        'created_at': 'DATETIME NOT NULL',
        'updated_at': 'DATETIME NOT NULL'
    },
    'indexes': {
        'idx_agent_id': 'agent_id',
        'idx_service_type': 'service_type',
        'idx_service_name': 'service_name',
        'idx_service_id': 'service_id',
        'idx_is_monitored': 'is_monitored',
        'idx_status': 'status'
    },
    'foreign_keys': {
        'fk_monitoring_monitored_services_agent': {
            'columns': 'agent_id',
            'reference_table': 'monitoring_agents',
            'reference_columns': 'id'
        }
    },
    'triggers': {
        'before_insert': 'SET NEW.created_at = NOW(), NEW.updated_at = NOW()',
        'before_update': 'SET NEW.updated_at = NOW()'
    }
}; 