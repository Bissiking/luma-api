import { logger } from '../config/logger';
import MonitoringMetric from '../models/MonitoringMetric';

const METRICS_BATCH_SIZE = 100; // Nombre de métriques à insérer en une fois
const AGGREGATION_INTERVAL = 300; // Intervalle d'agrégation en secondes (5 minutes)

class MetricsService {
  private metricsBuffer: Map<string, any[]>;
  private lastFlush: number;

  constructor() {
    this.metricsBuffer = new Map();
    this.lastFlush = Date.now();

    // Flush périodique du buffer
    setInterval(() => this.flushBuffer(), AGGREGATION_INTERVAL * 1000);
  }

  private bufferMetric(metric: any): void {
    const key = `${metric.agent_id}:${metric.type}:${metric.name}`;
    if (!this.metricsBuffer.has(key)) {
      this.metricsBuffer.set(key, []);
    }
    this.metricsBuffer.get(key)?.push(metric);

    // Flush si le buffer atteint la taille maximale
    if (this.metricsBuffer.size >= METRICS_BATCH_SIZE) {
      this.flushBuffer();
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.metricsBuffer.size === 0) return;

    const now = Date.now();
    const metrics = [];

    for (const [key, values] of this.metricsBuffer.entries()) {
      if (values.length === 0) continue;

      // Calculer la moyenne pour la période
      const aggregatedValue = values.reduce((sum, m) => sum + m.value, 0) / values.length;
      const lastMetric = values[values.length - 1];

      metrics.push({
        agent_id: lastMetric.agent_id,
        type: lastMetric.type,
        name: lastMetric.name,
        value: aggregatedValue,
        unit: lastMetric.unit,
        details: lastMetric.details || null,
        timestamp: new Date(now),
        created_at: new Date(now)
      });
    }

    try {
      // Insertion en batch avec upsert
      if (metrics.length > 0) {
        await MonitoringMetric.bulkCreate(metrics, {
          updateOnDuplicate: [
            'value',
            'timestamp',
            'created_at',
            'details'
          ]
        });
      }

      logger.debug(`Métriques agrégées et insérées avec succès`, {
        count: metrics.length,
        interval: Math.round((now - this.lastFlush) / 1000)
      });
    } catch (error) {
      logger.error('Erreur lors de l\'insertion des métriques:', error);
    }

    this.metricsBuffer.clear();
    this.lastFlush = now;
  }

  public async addMetric(metric: any): Promise<void> {
    this.bufferMetric(metric);
  }

  public async getLatestMetrics(agentId: number, type?: string): Promise<any[]> {
    const where: any = { agent_id: agentId };
    if (type) where.type = type;

    // Vérifier d'abord dans le buffer
    const bufferMetrics = Array.from(this.metricsBuffer.values())
      .flat()
      .filter(m => m.agent_id === agentId && (!type || m.type === type))
      .slice(0, 100);

    if (bufferMetrics.length > 0) {
      return bufferMetrics;
    }

    // Si pas dans le buffer, requête BD
    return MonitoringMetric.findAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: 100
    });
  }
}

export default new MetricsService(); 