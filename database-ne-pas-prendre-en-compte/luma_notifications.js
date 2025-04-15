/**
 * Définition de la table des notifications générales du site
 */
module.exports = {
    'name': 'luma_notifications',
    'version': '1.0.0',
    'description': 'Table pour stocker les notifications générales du site (annonces, mises à jour, news)',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'title': 'VARCHAR(255) NOT NULL',
        'content': 'TEXT NOT NULL',
        'type': "ENUM('announcement', 'update', 'news', 'alert', 'maintenance') NOT NULL",
        'priority': "ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium'",
        'status': "ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft'",
        'start_date': 'DATETIME NOT NULL',
        'end_date': 'DATETIME NULL',
        'created_by': 'INT NOT NULL',
        'target_roles': "SET('user', 'admin', 'manager', 'support') NOT NULL DEFAULT 'user'",
        'target_modules': "SET('dashboard', 'tickets', 'nino', 'monitoring', 'all') NOT NULL DEFAULT 'all'",
        'dismissible': 'TINYINT(1) NOT NULL DEFAULT 1',
        'link': 'VARCHAR(255) NULL',
        'link_text': 'VARCHAR(100) NULL',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'type_idx': ['type'],
        'status_idx': ['status'],
        'date_idx': ['start_date', 'end_date'],
        'created_by_idx': ['created_by']
    },
    'foreign_keys': {
        'fk_notifications_user': {
            'columns': 'created_by',
            'reference_table': 'luma_users',
            'reference_columns': 'id',
            'on_delete': 'CASCADE',
            'on_update': 'CASCADE'
        }
    }
}; 