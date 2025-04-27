import { MonitoringAgent } from '../models/MonitoringAgent';

export interface MonitoringMetric {
  id: number;
  agent_id: number;
  agent_uuid: string;
  metrics: any; // Type plus précis à définir selon la structure des métriques
  timestamp: Date;
  created_at: Date;
  agent?: MonitoringAgent;
} 