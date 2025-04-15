/**
 * Définition de la table luma_versions
 */
module.exports = {
    'name': 'luma_versions',
    'module': 'luma',
    'description': 'Table des versions des tables',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'table_name': 'VARCHAR(100) NOT NULL',
        'module': 'VARCHAR(50) NOT NULL DEFAULT "luma"',
        'version': 'VARCHAR(20) NOT NULL',
        'description': 'TEXT',
        'updated_at': 'DATETIME NOT NULL',
        'created_at': 'DATETIME NOT NULL'
    },
    'indexes': {
        'idx_table_name': 'table_name',
        'idx_module': 'module',
        'idx_version': 'version'
    },
    'foreign_keys': {}
}; 