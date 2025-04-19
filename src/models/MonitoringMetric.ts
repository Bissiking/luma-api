import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import MonitoringAgent from './MonitoringAgent';

class MonitoringMetric extends Model {
  public id!: number;
  public agent_id!: number;
  public agent_uuid!: string;
  public metrics!: object; // Champ JSON pour stocker toutes les métriques
  public timestamp!: Date;
  public created_at!: Date;
}

MonitoringMetric.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    agent_id: {
      type: DataTypes.INTEGER({ length: 11 }),
      allowNull: false,
    },
    agent_uuid: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    metrics: {
      type: DataTypes.JSON,
      allowNull: false,
      comment: 'Ensemble des métriques au format JSON',
      validate: {
        isValidJSON(value: any) {
          try {
            if (typeof value === 'string') {
              JSON.parse(value);
            } else if (typeof value === 'object') {
              JSON.stringify(value);
            } else {
              throw new Error('Le format JSON est invalide');
            }
          } catch (error) {
            throw new Error('Le format JSON est invalide');
          }
        }
      }
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'MonitoringMetric',
    tableName: 'monitoring_metrics',
    timestamps: false,
    indexes: [
      {
        name: 'idx_agent_id',
        fields: ['agent_id']
      },
      {
        name: 'idx_agent_uuid',
        fields: ['agent_uuid']
      },
      {
        name: 'idx_timestamp',
        fields: ['timestamp']
      }
    ],
    hooks: {
      beforeCreate: async (instance: MonitoringMetric) => {
        // S'assurer que metrics est un objet valide
        if (typeof instance.metrics === 'string') {
          try {
            instance.metrics = JSON.parse(instance.metrics);
          } catch (error) {
            throw new Error('Format JSON invalide pour les métriques');
          }
        }
      },
      beforeUpdate: async (instance: MonitoringMetric) => {
        // S'assurer que metrics est un objet valide
        if (typeof instance.metrics === 'string') {
          try {
            instance.metrics = JSON.parse(instance.metrics);
          } catch (error) {
            throw new Error('Format JSON invalide pour les métriques');
          }
        }
      }
    }
  }
);

// Relations
MonitoringMetric.belongsTo(MonitoringAgent, {
  foreignKey: 'agent_id',
  as: 'agent'
});

export default MonitoringMetric; 