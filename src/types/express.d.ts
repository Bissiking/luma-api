import { Request as ExpressRequest } from 'express';
import { MonitoringAgent } from '../models';
import { NinoInstance } from '../models/NinoInstance';

export interface Request extends ExpressRequest {
  agent?: MonitoringAgent;
  ninoInstance?: NinoInstance;
}

declare global {
  namespace Express {
    interface Request {
      agent?: MonitoringAgent;
      ninoInstance?: NinoInstance;
    }
  }
} 