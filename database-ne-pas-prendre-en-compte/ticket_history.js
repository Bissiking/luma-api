/**
 * Définition de la table de l'historique des tickets
 */
module.exports = {
    'name': 'ticket_history',
    'module': 'tickets',
    'description': 'Table de l\'historique des tickets',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'ticket_id': 'INT NOT NULL',
        'performed_by': 'INT',
        'action': 'VARCHAR(50) NOT NULL',
        'details': 'TEXT',
        'old_value': 'TEXT',
        'new_value': 'TEXT',
        'performed_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_ticket_id': 'ticket_id',
        'idx_performed_by': 'performed_by',
        'idx_action': 'action',
        'idx_performed_at': 'performed_at'
    },
    'foreign_keys': {
        'fk_ticket_history_ticket_id': {
            'columns': 'ticket_id',
            'reference_table': 'luma_tickets',
            'reference_columns': 'id'
        },
        'fk_ticket_history_performed_by': {
            'columns': 'performed_by',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        }
    }
}; 