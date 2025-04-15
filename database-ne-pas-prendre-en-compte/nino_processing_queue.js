/**
 * Définition de la table de la file d'attente de traitement des vidéos
 */
module.exports = {
    'name': 'nino_processing_queue',
    'module': 'nino',
    'description': 'Table de la file d\'attente de traitement des vidéos',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'video_id': 'INT NOT NULL',
        'priority': 'ENUM("low", "medium", "high") NOT NULL DEFAULT "medium"',
        'status': 'ENUM("pending", "processing", "completed", "failed") NOT NULL DEFAULT "pending"',
        'processing_type': 'ENUM("transcode", "intro_add", "thumbnail") NOT NULL',
        'parameters': 'JSON',
        'error_message': 'TEXT',
        'started_at': 'DATETIME',
        'completed_at': 'DATETIME',
        'created_at': 'DATETIME NOT NULL',
        'updated_at': 'DATETIME NOT NULL'
    },
    'indexes': {
        'idx_video_id': 'video_id',
        'idx_status': 'status',
        'idx_priority': 'priority',
        'idx_created_at': 'created_at'
    },
    'foreign_keys': {
        'fk_nino_processing_queue_video': {
            'columns': 'video_id',
            'reference_table': 'nino_videos',
            'reference_columns': 'id'
        }
    },
    'triggers': {
        'before_insert': 'SET NEW.created_at = NOW(), NEW.updated_at = NOW()',
        'before_update': 'SET NEW.updated_at = NOW()'
    }
}; 