/**
 * Définition de la table des escalades de tickets
 */
module.exports = {
    'name': 'ticket_escalation',
    'module': 'tickets',
    'description': 'Table des escalades de tickets',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'ticket_id': 'INT NOT NULL',
        'escalated_to': 'INT',
        'escalation_reason': 'TEXT',
        'escalated_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'resolved_at': 'DATETIME',
        'resolved_by': 'INT',
        'resolution_note': 'TEXT'
    },
    'indexes': {
        'idx_ticket_id': 'ticket_id',
        'idx_escalated_to': 'escalated_to',
        'idx_escalated_at': 'escalated_at',
        'idx_resolved_at': 'resolved_at'
    },
    'foreign_keys': {
        'fk_ticket_escalation_ticket_id': {
            'columns': 'ticket_id',
            'reference_table': 'luma_tickets',
            'reference_columns': 'id'
        },
        'fk_ticket_escalation_escalated_to': {
            'columns': 'escalated_to',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        },
        'fk_ticket_escalation_resolved_by': {
            'columns': 'resolved_by',
            'reference_table': 'luma_users',
            'reference_columns': 'id'
        }
    }
}; 