const { createClient } = require('redis');
const dotenv = require('dotenv');

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const client = createClient({ url: redisUrl });

client.on('error', (err) => console.error('[REDIS TEST] Erreur Redis:', err));
client.on('connect', () => console.log('[REDIS TEST] Connecté à Redis !'));

(async () => {
  try {
    await client.connect();
    const pong = await client.ping();
    console.log('[REDIS TEST] Réponse PING:', pong);
    await client.quit();
    console.log('[REDIS TEST] Déconnexion réussie.');
    process.exit(0);
  } catch (err) {
    console.error('[REDIS TEST] Erreur lors du test Redis:', err);
    process.exit(1);
  }
})(); 