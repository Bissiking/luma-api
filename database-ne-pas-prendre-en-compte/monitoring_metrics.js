/**
 * Définition de la table des métriques reçues des collecteurs
 */
module.exports = {
    'name': 'monitoring_metrics',
    'module': 'monitoring',
    'description': 'Table des métriques reçues des collecteurs',
    'version': '2.0.0',
    'charset': 'utf8mb4',
    'collation': 'utf8mb4_bin',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'agent_id': 'INT(11) NOT NULL',
        'agent_uuid': 'VARCHAR(255) NOT NULL',
        'metrics': 'JSON NOT NULL COMMENT "Ensemble des métriques au format JSON"',
        'timestamp': 'DATETIME NOT NULL',
        'created_at': 'DATETIME NOT NULL'
    },
    'indexes': {
        'idx_agent_id': 'agent_id',
        'idx_agent_uuid': 'agent_uuid',
        'idx_timestamp': 'timestamp'
    },
    'foreign_keys': {
        'fk_monitoring_metrics_agent': {
            'columns': 'agent_id',
            'reference_table': 'monitoring_agents',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        }
    },
    'triggers': {
        'before_insert': 'SET NEW.created_at = NOW()'
    }
};
