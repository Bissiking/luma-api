/**
 * Définition de la table d'activité des utilisateurs
 */
module.exports = {
    'name': 'luma_user_activity',
    'version': '1.0.0',
    'description': 'Table pour enregistrer l\'activité des utilisateurs dans l\'application',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'user_id': 'INT NOT NULL',
        'action': "ENUM('login', 'logout', 'failed_login', 'password_change', 'profile_update', 'ticket_create', 'ticket_update', 'token_revoked', 'admin_action', 'other') NOT NULL",
        'description': 'VARCHAR(255) NOT NULL',
        'details': 'JSON NULL',
        'ip_address': 'VARCHAR(45) NULL',
        'user_agent': 'VARCHAR(255) NULL',
        'module': "ENUM('auth', 'profile', 'tickets', 'nino', 'monitoring', 'admin', 'system') NOT NULL DEFAULT 'system'",
        'resource_type': 'VARCHAR(50) NULL',
        'resource_id': 'VARCHAR(50) NULL',
        'status': "ENUM('success', 'failure', 'warning', 'info') NOT NULL DEFAULT 'success'",
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'session_id': 'VARCHAR(64) NULL',
        'token_jti': 'VARCHAR(64) NULL'
    },
    'indexes': {
        'user_idx': ['user_id'],
        'action_idx': ['action'],
        'timestamp_idx': ['created_at'],
        'module_idx': ['module'],
        'status_idx': ['status'],
        'resource_idx': ['resource_type', 'resource_id'],
        'token_idx': ['token_jti']
    },
    'foreign_keys': {
        'fk_activity_user': {
            'columns': 'user_id',
            'reference_table': 'luma_users',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        },
        'fk_activity_token': {
            'columns': 'token_jti',
            'reference_table': 'luma_tokens',
            'reference_columns': 'jti',
            'on_delete': 'SET NULL',
            'on_update': 'CASCADE'
        }
    }
}; 