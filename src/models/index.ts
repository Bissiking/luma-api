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
  MonitoringMetric
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
    
    logger.info('Synchronisation terminée');
    return true;
  } catch (error: any) {
    logger.error(`Erreur lors de la synchronisation des modèles: ${error.message}`);
    return false;
  }
}; 