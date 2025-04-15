/**
 * Définition de la table des vidéos
 */
module.exports = {
    'name': 'nino_videos',
    'module': 'nino',
    'description': 'Table des vidéos',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'original_filename': 'VARCHAR(255) NOT NULL',
        'file_path': 'VARCHAR(255) NOT NULL',
        'mime_type': 'VARCHAR(100) NOT NULL',
        'size': 'BIGINT NOT NULL',
        'status': 'ENUM("processing", "ready", "error", "deleted") NOT NULL DEFAULT "processing"',
        'duration': 'INT UNSIGNED',
        'width': 'INT UNSIGNED',
        'height': 'INT UNSIGNED',
        'bitrate': 'INT UNSIGNED',
        'codec': 'VARCHAR(50)',
        'thumbnail_path': 'VARCHAR(255)',
        'intro_video_id': 'INT',
        'series_id': 'INT',
        'season_number': 'INT UNSIGNED',
        'episode_number': 'INT UNSIGNED',
        'title': 'VARCHAR(255)',
        'description': 'TEXT',
        'metadata': 'JSON',
        'error_message': 'TEXT',
        'processing_progress': 'INT UNSIGNED DEFAULT 0',
        'created_at': 'DATETIME NOT NULL',
        'updated_at': 'DATETIME NOT NULL',
        'processed_at': 'DATETIME'
    },
    'indexes': {
        'idx_status': 'status',
        'idx_series_id': 'series_id',
        'idx_season_episode': ['season_number', 'episode_number'],
        'idx_created_at': 'created_at'
    },
    'foreign_keys': {
        'fk_series': {
            'columns': 'series_id',
            'reference_table': 'nino_series',
            'reference_columns': 'id'
        }
    },
    'triggers': {
        'before_insert': 'SET NEW.created_at = NOW(), NEW.updated_at = NOW()',
        'before_update': 'SET NEW.updated_at = NOW()'
    }
}; 