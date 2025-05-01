export const ARKOS_CONFIG = {
  // Configuration du cache
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes en secondes
    maxItems: 1000
  },
  
  // Configuration de la pagination
  pagination: {
    defaultLimit: 100,
    maxLimit: 1000
  },
  
  // Configuration des requêtes
  queries: {
    // Intervalle de temps par défaut pour les requêtes de métriques
    defaultTimeRange: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
    
    // Nombre maximum de métriques à retourner par requête
    maxMetricsPerRequest: 1000,
    
    // Intervalle de temps minimum entre deux requêtes identiques
    minRequestInterval: 1000 // 1 seconde
  },
  
  // Configuration des index
  indexes: {
    metrics: {
      created_at: true,
      agent_id: true,
      agent_uuid: true
    }
  }
}; 