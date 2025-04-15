/**
 * Définition de la table des alertes de monitoring
 */
module.exports = {
    'name': 'monitoring_alerts',
    'module': 'monitoring',
    'description': 'Table des alertes de monitoring avec gestion des alertes temporaires et permanentes',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'agent_id': 'INT NOT NULL',
        'service_id': 'INT',
        'alert_type': 'ENUM("critical", "warning", "ok") NOT NULL',
        'message': 'TEXT',
        'value': 'FLOAT',
        'threshold': 'FLOAT',
        'unit': 'VARCHAR(20)',
        'status': 'ENUM("active", "acknowledged", "resolved", "escalated") NOT NULL DEFAULT "active"',
        'acknowledged': 'BOOLEAN NOT NULL DEFAULT 0',
        'acknowledged_at': 'DATETIME',
        'acknowledged_by': 'INT',
        'resolved': 'BOOLEAN NOT NULL DEFAULT 0',
        'resolved_at': 'DATETIME',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'last_notification_at': 'DATETIME',
        'notification_interval': 'INT NOT NULL DEFAULT 900', -- 15 minutes en secondes
        'metadata': 'JSON',
        'tags': 'JSON'
    },
    'indexes': {
        'idx_agent_id': 'agent_id',
        'idx_service_id': 'service_id',
        'idx_alert_type': 'alert_type',
        'idx_status': 'status',
        'idx_created_at': 'created_at',
        'idx_last_notification': 'last_notification_at'
    },
    'foreign_keys': {
        'fk_agent_id': {
            'columns': 'agent_id',
            'reference_table': 'monitoring_agents',
            'reference_columns': 'id'
        },
        'fk_service_id': {
            'columns': 'service_id',
            'reference_table': 'monitoring_monitored_services',
            'reference_columns': 'id'
        },
        'fk_acknowledged_by': {
            'columns': 'acknowledged_by',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        }
    },
    'triggers': [
        {
            'name': 'update_alert_status',
            'timing': 'BEFORE',
            'event': 'UPDATE',
            'statement': `
                IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
                    SET NEW.resolved_at = CURRENT_TIMESTAMP;
                END IF;
                
                IF NEW.status = 'acknowledged' AND OLD.status != 'acknowledged' THEN
                    SET NEW.acknowledged_at = CURRENT_TIMESTAMP;
                END IF;
            `
        }
    ]
}; 