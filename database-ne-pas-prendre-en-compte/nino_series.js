/**
 * Définition de la table des séries
 */
module.exports = {
    'name': 'nino_series',
    'module': 'nino',
    'description': 'Table des séries',
    'version': '1.0.0',
    'schema': {
        'id': 'INT AUTO_INCREMENT PRIMARY KEY',
        'title': 'VARCHAR(255) NOT NULL',
        'description': 'TEXT',
        'poster_path': 'VARCHAR(255)',
        'banner_path': 'VARCHAR(255)',
        'release_year': 'YEAR',
        'status': 'ENUM("ongoing", "completed", "cancelled") NOT NULL DEFAULT "ongoing"',
        'total_seasons': 'INT UNSIGNED DEFAULT 0',
        'total_episodes': 'INT UNSIGNED DEFAULT 0',
        'metadata': 'JSON',
        'created_at': 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
        'updated_at': 'DATETIME NULL ON UPDATE CURRENT_TIMESTAMP'
    },
    'indexes': {
        'idx_title': 'title',
        'idx_status': 'status',
        'idx_release_year': 'release_year'
    },
    'foreign_keys': {},
    'triggers': {
        'update_total_seasons': {
            'event': 'AFTER INSERT',
            'table': 'nino_videos',
            'statement': 'BEGIN\n\
                IF NEW.season_number > (SELECT total_seasons FROM nino_series WHERE id = NEW.series_id) THEN\n\
                    UPDATE nino_series\n\
                    SET total_seasons = NEW.season_number\n\
                    WHERE id = NEW.series_id;\n\
                END IF;\n\
            END;'
        },
        'update_total_episodes': {
            'event': 'AFTER INSERT',
            'table': 'nino_videos',
            'statement': 'BEGIN\n\
                UPDATE nino_series\n\
                SET total_episodes = total_episodes + 1\n\
                WHERE id = NEW.series_id;\n\
            END;'
        },
        'decrement_total_episodes': {
            'event': 'AFTER DELETE',
            'table': 'nino_videos',
            'statement': 'BEGIN\n\
                UPDATE nino_series\n\
                SET total_episodes = total_episodes - 1\n\
                WHERE id = OLD.series_id;\n\
            END;'
        },
        'decrement_total_seasons': {
            'event': 'AFTER DELETE',
            'table': 'nino_videos',
            'statement': 'BEGIN\n\
                DECLARE season_count INT;\n\
                SELECT COUNT(*) INTO season_count\n\
                FROM nino_videos\n\
                WHERE series_id = OLD.series_id AND season_number = OLD.season_number;\n\
                IF season_count = 0 THEN\n\
                    UPDATE nino_series\n\
                    SET total_seasons = total_seasons - 1\n\
                    WHERE id = OLD.series_id;\n\
                END IF;\n\
            END;'
        }
    }
}; 