import { Request as ExpressRequest } from 'express';
import { MonitoringAgent } from '../models';

export interface Request extends ExpressRequest {
  agent?: MonitoringAgent;
}

declare global {
  namespace Express {
    interface Request {
      agent?: MonitoringAgent;
    }
  }
} 