/**
 * Définition de la table de configuration des agents de monitoring
 */
module.exports = {
    'name': 'monitoring_agent_configs',
    'module': 'monitoring',
    'description': 'Configuration des agents de monitoring',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'agent_id': 'INT NOT NULL',
        'interval': 'INT UNSIGNED NOT NULL DEFAULT 60',
        'log_level': 'ENUM("DEBUG", "INFO", "WARNING", "ERROR") NOT NULL DEFAULT "INFO"',
        'cpu_collector_enabled': 'BOOLEAN NOT NULL DEFAULT TRUE',
        'cpu_warning_threshold': 'INT UNSIGNED NOT NULL DEFAULT 80',
        'cpu_critical_threshold': 'INT UNSIGNED NOT NULL DEFAULT 90',
        'memory_collector_enabled': 'BOOLEAN NOT NULL DEFAULT TRUE',
        'memory_warning_threshold': 'INT UNSIGNED NOT NULL DEFAULT 80',
        'memory_critical_threshold': 'INT UNSIGNED NOT NULL DEFAULT 90',
        'disk_collector_enabled': 'BOOLEAN NOT NULL DEFAULT TRUE',
        'disk_warning_threshold': 'INT UNSIGNED NOT NULL DEFAULT 80',
        'disk_critical_threshold': 'INT UNSIGNED NOT NULL DEFAULT 90',
        'network_collector_enabled': 'BOOLEAN NOT NULL DEFAULT TRUE',
        'network_warning_threshold': 'INT UNSIGNED NOT NULL DEFAULT 80',
        'network_critical_threshold': 'INT UNSIGNED NOT NULL DEFAULT 90',
        'docker_collector_enabled': 'BOOLEAN NOT NULL DEFAULT FALSE',
        'docker_warning_threshold': 'INT UNSIGNED NOT NULL DEFAULT 80',
        'docker_critical_threshold': 'INT UNSIGNED NOT NULL DEFAULT 90',
        'web_service_collector_enabled': 'BOOLEAN NOT NULL DEFAULT FALSE',
        'web_service_warning_threshold': 'INT UNSIGNED NOT NULL DEFAULT 80',
        'web_service_critical_threshold': 'INT UNSIGNED NOT NULL DEFAULT 90',
        'windows_services': 'JSON',
        'linux_services': 'JSON',
        'docker_containers': 'JSON',
        'alerts_enabled': 'BOOLEAN NOT NULL DEFAULT TRUE',
        'notification_email': 'VARCHAR(255)',
        'notification_discord_webhook': 'VARCHAR(255)',
        'notification_slack_webhook': 'VARCHAR(255)',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_agent_id': 'agent_id'
    },
    'foreign_keys': {
        'fk_agent': {
            'columns': 'agent_id',
            'reference_table': 'monitoring_agents',
            'reference_columns': 'id'
        }
    }
}; 