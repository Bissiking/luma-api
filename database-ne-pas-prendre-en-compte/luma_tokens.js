/**
 * Définition de la table des tokens JWT
 */
module.exports = {
    'name': 'luma_tokens',
    'version': '1.0.0',
    'description': 'Table pour stocker et gérer les tokens JWT',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'user_id': 'INT NOT NULL',
        'token': 'VARCHAR(1024) NOT NULL',
        'jti': 'VARCHAR(64) NOT NULL',
        'token_type': 'ENUM("access", "refresh") NOT NULL DEFAULT "access"',
        'issued_at': 'DATETIME NOT NULL',
        'expires_at': 'DATETIME NOT NULL',
        'revoked': 'TINYINT(1) NOT NULL DEFAULT 0',
        'revoked_by': 'INT NULL',
        'revoked_at': 'DATETIME NULL',
        'device_info': 'VARCHAR(255) NULL',
        'ip_address': 'VARCHAR(45) NULL',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'token_idx': ['jti'],
        'user_idx': ['user_id'],
        'expires_idx': ['expires_at']
    },
    'foreign_keys': {
        'fk_tokens_user': {
            'columns': 'user_id',
            'reference_table': 'luma_users',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        },
        'fk_tokens_revoked_by': {
            'columns': 'revoked_by',
            'reference_table': 'luma_users',
            'reference_columns': 'id',
            'on_delete': 'SET NULL',
            'on_update': 'CASCADE'
        }
    }
}; 