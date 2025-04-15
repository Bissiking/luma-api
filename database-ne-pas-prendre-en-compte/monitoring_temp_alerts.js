/**
 * Définition de la table des alertes temporaires de monitoring
 */
module.exports = {
    'name': 'monitoring_temp_alerts',
    'module': 'monitoring',
    'description': 'Table des alertes temporaires de monitoring (auto-nettoyage après 10 minutes)',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'agent_id': 'INT NOT NULL',
        'alert_id': 'VARCHAR(36) NOT NULL UNIQUE',
        'metric': 'VARCHAR(50) NOT NULL',
        'value': 'FLOAT NOT NULL',
        'threshold': 'FLOAT NOT NULL',
        'status': 'ENUM("pending", "resolved", "escalated") NOT NULL DEFAULT "pending"',
        'metadata': 'JSON',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'resolved_at': 'DATETIME',
        'expires_at': 'DATETIME NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL 10 MINUTE)'
    },
    'indexes': {
        'idx_agent_id': 'agent_id',
        'idx_alert_id': 'alert_id',
        'idx_metric': 'metric',
        'idx_status': 'status',
        'idx_expires_at': 'expires_at'
    },
    'foreign_keys': {
        'fk_agent_id': {
            'columns': 'agent_id',
            'reference_table': 'monitoring_agents',
            'reference_columns': 'id'
        }
    },
    'triggers': [
        {
            'name': 'cleanup_expired_alerts',
            'timing': 'AFTER',
            'event': 'INSERT',
            'statement': `
                CREATE EVENT IF NOT EXISTS cleanup_expired_alerts
                ON SCHEDULE EVERY 1 MINUTE
                DO
                    DELETE FROM monitoring_temp_alerts 
                    WHERE expires_at < CURRENT_TIMESTAMP
            `
        }
    ]
}; 