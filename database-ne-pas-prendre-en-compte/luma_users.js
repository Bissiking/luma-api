/**
 * Définition de la table luma_users
 */
module.exports = {
    'name': 'luma_users',
    'module': 'luma',
    'description': 'Table des utilisateurs',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'username': 'VARCHAR(50) NOT NULL UNIQUE',
        'password': 'VARCHAR(255) NOT NULL',
        'email': 'VARCHAR(100) NOT NULL UNIQUE',
        'name': 'VARCHAR(100) NOT NULL',
        'role': 'VARCHAR(20) NOT NULL DEFAULT "user"',
        'account_administrator': 'BOOLEAN NOT NULL DEFAULT FALSE',
        'account_active': 'BOOLEAN NOT NULL DEFAULT TRUE',
        'last_login': 'DATETIME NULL',
        'created_at': 'DATETIME NOT NULL',
        'updated_at': 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_username': 'username',
        'idx_email': 'email',
        'idx_role': 'role'
    },
    'foreign_keys': {}
}; 