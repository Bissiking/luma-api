/**
 * Définition de la table luma_settings
 */
module.exports = {
    'name': 'luma_settings',
    'module': 'luma',
    'description': 'Table des paramètres',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'name': 'VARCHAR(100) NOT NULL UNIQUE',
        'value': 'TEXT',
        'autoload': 'BOOLEAN NOT NULL DEFAULT FALSE',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_name': 'name',
        'idx_autoload': 'autoload'
    },
    'foreign_keys': {}
}; 