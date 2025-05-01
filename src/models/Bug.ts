import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/db';
import User from './User';

class Bug extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public content!: string;
  public status!: 'nouveau' | 'en_cours' | 'en_test' | 'resolu' | 'ferme' | 'rejete';
  public priority!: 'critique' | 'elevee' | 'moyenne' | 'basse';
  public component_id!: number | null;
  public reported_by!: number;
  public assigned_to!: number | null;
  public created_at!: Date;
  public updated_at!: Date;
  public resolved_at!: Date | null;
  public images?: string[];

  // Timestamps
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  
  // Surcharger la méthode toJSON pour garantir que status est toujours présent
  toJSON() {
    const values = Object.assign({}, this.get());
    
    // S'assurer que le status est défini
    if (values.status === undefined) {
      values.status = 'nouveau';
    }
    
    return values;
  }
}

Bug.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('nouveau', 'en_cours', 'en_test', 'resolu', 'ferme', 'rejete'),
      allowNull: false,
      defaultValue: 'nouveau',
    },
    priority: {
      type: DataTypes.ENUM('critique', 'elevee', 'moyenne', 'basse'),
      allowNull: false,
      defaultValue: 'moyenne',
    },
    component_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reported_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    resolved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
  },
  {
    sequelize,
    modelName: 'Bug',
    tableName: 'luma_bugs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { fields: ['status'] },
      { fields: ['priority'] },
      { fields: ['component_id'] },
      { fields: ['reported_by'] },
      { fields: ['assigned_to'] },
    ],
  }
);

export default Bug; 