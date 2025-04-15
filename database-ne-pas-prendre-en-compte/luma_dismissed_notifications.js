/**
 * Définition de la table des notifications ignorées par les utilisateurs
 */
module.exports = {
    'name': 'luma_dismissed_notifications',
    'version': '1.0.0',
    'description': 'Table pour stocker les notifications que les utilisateurs ont masquées/ignorées',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'user_id': 'INT NOT NULL',
        'notification_id': 'INT NOT NULL',
        'dismissed_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'device_info': 'VARCHAR(255) NULL',
        'ip_address': 'VARCHAR(45) NULL'
    },
    'indexes': {
        'user_notification_idx': ['user_id', 'notification_id'],
        'notification_idx': ['notification_id']
    },
    'foreign_keys': {
        'fk_dismissed_user': {
            'columns': 'user_id',
            'reference_table': 'luma_users',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        },
        'fk_dismissed_notification': {
            'columns': 'notification_id',
            'reference_table': 'luma_notifications',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        }
    }
}; 