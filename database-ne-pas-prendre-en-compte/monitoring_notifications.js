/**
 * Définition de la table des notifications de monitoring
 */
module.exports = {
    'name': 'monitoring_notifications',
    'module': 'monitoring',
    'description': 'Table des notifications de monitoring',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'agent_id': 'INT NOT NULL',
        'notification_type': 'ENUM("discord", "email", "sms", "webhook") NOT NULL',
        'config_name': 'VARCHAR(100) NOT NULL',
        'config_value': 'TEXT NOT NULL',
        'is_active': 'BOOLEAN NOT NULL DEFAULT 1',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_agent_id': 'agent_id',
        'idx_notification_type': 'notification_type',
        'idx_is_active': 'is_active'
    },
    'foreign_keys': {
        'fk_monitoring_notifications_agent': {
            'columns': 'agent_id',
            'reference_table': 'monitoring_agents',
            'reference_columns': 'id'
        }
    }
}; 