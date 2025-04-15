/**
 * Définition de la table luma_user_groups
 */
module.exports = {
    'name': 'luma_user_groups',
    'module': 'luma',
    'description': 'Table de liaison entre utilisateurs et groupes',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'user_id': 'INT NOT NULL',
        'group_id': 'INT NOT NULL',
        'role': "ENUM('member', 'admin') NOT NULL DEFAULT 'member'",
        'added_by': 'INT NOT NULL',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_user_id': 'user_id',
        'idx_group_id': 'group_id',
        'idx_added_by': 'added_by',
        'unique_user_group': ['user_id', 'group_id']
    },
    'foreign_keys': {
        'fk_user_groups_user': {
            'columns': 'user_id',
            'reference_table': 'luma_users',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        },
        'fk_user_groups_group': {
            'columns': 'group_id',
            'reference_table': 'luma_groups',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        },
        'fk_user_groups_added_by': {
            'columns': 'added_by',
            'reference_table': 'luma_users',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        }
    }
}; 