import User from './User';
import MonitoringAgent from './MonitoringAgent';
import MonitoringAgentConfig from './MonitoringAgentConfig';
import MonitoringMetric from './MonitoringMetric';

export const setupAssociations = () => {
  // Relations MonitoringAgent
  MonitoringAgent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  MonitoringAgent.hasOne(MonitoringAgentConfig, { foreignKey: 'agent_id', as: 'config' });
  MonitoringAgent.hasMany(MonitoringMetric, { foreignKey: 'agent_id', as: 'metrics' });

  // Relations MonitoringAgentConfig
  MonitoringAgentConfig.belongsTo(MonitoringAgent, { foreignKey: 'agent_id', as: 'agent' });
}; 