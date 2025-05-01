import User from './User';
import Group from './Group';
import Permission from './Permission';
import UserGroup from './UserGroup';
import GroupPermission from './GroupPermission';
import MonitoringAgent from './MonitoringAgent';
import MonitoringAgentConfig from './MonitoringAgentConfig';
import MonitoringMetric from './MonitoringMetric';
import Bug from './Bug';
import DebugReport from './DebugReport';

// Association User-Group via UserGroup
User.belongsToMany(Group, {
  through: UserGroup,
  foreignKey: 'user_id',
  otherKey: 'group_id',
  as: 'groups'
});

Group.belongsToMany(User, {
  through: UserGroup,
  foreignKey: 'group_id',
  otherKey: 'user_id',
  as: 'users'
});

// Relations MonitoringAgent
MonitoringAgent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
MonitoringAgent.hasOne(MonitoringAgentConfig, { foreignKey: 'agent_id', as: 'config' });
MonitoringAgent.hasMany(MonitoringMetric, { foreignKey: 'agent_id', as: 'metrics' });

// Relations MonitoringAgentConfig
MonitoringAgentConfig.belongsTo(MonitoringAgent, { foreignKey: 'agent_id', as: 'agent' });

// Relations Bug
Bug.belongsTo(User, { foreignKey: 'reported_by', as: 'reporter' });
Bug.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });

// Relations DebugReport
DebugReport.belongsTo(User, { foreignKey: 'reported_by', as: 'reporter' });

/**
 * Initialiser toutes les associations
 */
export const initAssociations = () => {
  console.log('Associations des modèles initialisées');
};

export default {
  initAssociations
}; 