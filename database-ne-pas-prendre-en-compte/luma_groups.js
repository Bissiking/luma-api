/**
 * Définition de la table luma_groups
 */
module.exports = {
    'name': 'luma_groups',
    'module': 'luma',
    'description': 'Table des groupes d\'utilisateurs',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'name': 'VARCHAR(100) NOT NULL UNIQUE',
        'description': 'TEXT',
        'color': 'VARCHAR(7) DEFAULT "#3498db"',
        'created_by': 'INT NOT NULL',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_name': 'name',
        'idx_created_by': 'created_by'
    },
    'foreign_keys': {
        'fk_groups_created_by': {
            'columns': 'created_by',
            'reference_table': 'luma_users',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        }
    }
}; 