import User from './User';
import ApiStatus from './ApiStatus';
import Ticket from './Ticket';
import TicketCategory from './TicketCategory';
import TicketComment from './TicketComment';
import TicketHistory from './TicketHistory';
import TicketEscalation from './TicketEscalation';
import MonitoringAgent from './MonitoringAgent';
import MonitoringAgentConfig from './MonitoringAgentConfig';
import MonitoringAlert from './MonitoringAlert';
import MonitoringMetric from './MonitoringMetric';
import Group from './Group';
import Permission from './Permission';
import GroupPermission from './GroupPermission';
import UserGroup from './UserGroup';
import Bug from './Bug';
import DebugReport from './DebugReport';
import { dbLogger as logger } from '../config/logger';

// Export all models
export {
  User,
  ApiStatus,
  Ticket,
  TicketCategory,
  TicketComment,
  TicketHistory,
  TicketEscalation,
  MonitoringAgent,
  MonitoringAgentConfig,
  MonitoringAlert,
  MonitoringMetric,
  Group,
  Permission,
  GroupPermission,
  UserGroup,
  Bug,
  DebugReport
};

// Sync all models with database
export const syncModels = async (force = false) => {
  try {
    logger.info('Synchronisation des modèles avec la base de données...');
    
    // Sync individual models
    await User.sync({ force });
    await ApiStatus.sync({ force });
    await TicketCategory.sync({ force });
    await Ticket.sync({ force });
    await TicketComment.sync({ force });
    await TicketHistory.sync({ force });
    await TicketEscalation.sync({ force });
    
    // Sync monitoring models
    await MonitoringAgent.sync({ force });
    await MonitoringAgentConfig.sync({ force });
    await MonitoringAlert.sync({ force });
    await MonitoringMetric.sync({ force });
    
    // Sync authorization models
    await Group.sync({ force });
    await Permission.sync({ force });
    await GroupPermission.sync({ force });
    await UserGroup.sync({ force });
    
    // Sync bug model
    await Bug.sync({ force });
    
    // Sync debug report model
    await DebugReport.sync({ force });
    
    logger.info('Synchronisation terminée');
    return true;
  } catch (error: any) {
    logger.error(`Erreur lors de la synchronisation des modèles: ${error.message}`);
    return false;
  }
}; 