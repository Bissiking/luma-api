/**
 * Définition de la table des métriques reçues des collecteurs
 */
module.exports = {
    'name': 'monitoring_metrics',
    'module': 'monitoring',
    'description': 'Table des métriques reçues des collecteurs',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'agent_id': 'INT NOT NULL',
        'service_id': 'INT',
        'name': 'VARCHAR(255) NOT NULL',
        'value': 'FLOAT NOT NULL',
        'unit': 'VARCHAR(50)',
        'tags': 'JSON',
        'timestamp': 'DATETIME NOT NULL',
        'created_at': 'DATETIME NOT NULL'
    },
    'indexes': {
        'idx_agent_id': 'agent_id',
        'idx_service_id': 'service_id',
        'idx_name': 'name',
        'idx_timestamp': 'timestamp'
    },
    'foreign_keys': {
        'fk_monitoring_metrics_agent': {
            'columns': 'agent_id',
            'reference_table': 'monitoring_agents',
            'reference_columns': 'id'
        },
        'fk_monitoring_metrics_service': {
            'columns': 'service_id',
            'reference_table': 'monitoring_monitored_services',
            'reference_columns': 'id'
        }
    },
    'triggers': {
        'before_insert': 'SET NEW.created_at = NOW()'
    }
}; 