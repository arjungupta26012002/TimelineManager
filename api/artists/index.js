const { CosmosClient } = require('@azure/cosmos');

module.exports = async function (context, req) {
  const endpoint = process.env.COSMOS_DB_ENDPOINT;
  const key = process.env.COSMOS_DB_KEY;
  const databaseId = process.env.COSMOS_DB_DATABASE || 'studio-portal';

  if (!endpoint || !key) {
    context.res = { status: 500, body: 'Cosmos DB not configured (COSMOS_DB_ENDPOINT/COSMOS_DB_KEY).' };
    return;
  }

  const client = new CosmosClient({ endpoint, key });
  const db = client.database(databaseId);
  const container = db.container('artists');

  const method = (req.method || 'GET').toUpperCase();
  const userId = req.query.userId || (req.body && req.body.userId);

  try {
    if (method === 'GET') {
      if (!userId) return (context.res = { status: 400, body: 'userId required' });
      try {
        const { resource } = await container.item('artists', userId).read();
        if (resource) return (context.res = { body: resource });
      } catch (e) {
        // not found
      }
      context.res = { body: { id: 'artists', list: [] } };
      return;
    }

    if (method === 'POST') {
      const item = req.body;
      if (!item) return (context.res = { status: 400, body: 'Missing body' });
      const { resource } = await container.items.upsert(item);
      context.res = { body: resource };
      return;
    }

    context.res = { status: 405, body: 'Method not allowed' };
  } catch (e) {
    context.log.error(e);
    context.res = { status: 500, body: e.message || String(e) };
  }
};
