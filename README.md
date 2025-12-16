# Timeline Manager — Local Development

This project is configured to run a Vite React frontend and local Azure Functions for a secure server-side API that talks to Cosmos DB.

## Prerequisites
- Node.js (recommended 18+; Azure Functions suggests supported versions)
- npm
- Azure Functions Core Tools (the repo uses `npx azure-functions-core-tools@4` which will auto-download if needed)

## Local run
1. Install root deps and API deps:

```bash
cd "C:\Pembe Projects\Timeline Manager"
npm install
cd api
npm install
```

2. Configure local settings for the Functions host (edit `api/local.settings.json`). Set `COSMOS_DB_ENDPOINT` and `COSMOS_DB_KEY` to your Cosmos DB values for local testing. Example:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOS_DB_ENDPOINT": "https://<your-account>.documents.azure.com:443/",
    "COSMOS_DB_KEY": "<your-key>",
    "COSMOS_DB_DATABASE": "studio-portal"
  }
}
```

3. Start the Functions host (from project root):

```bash
npx azure-functions-core-tools@4 start --script-root ./api --cors "http://localhost:3000"
```

The Functions host runs on `http://localhost:7071` and exposes:
- `GET/POST /api/tasks`
- `GET/POST/DELETE/PUT /api/ideas/{id?}`
- `GET/POST /api/artists`

4. Start the frontend (from project root):

```bash
npm run dev
```

Vite is configured to proxy `/api` to the Functions host for local development, so the app should call `/api/...` and hit the Functions host transparently.

5. Open the app in the browser at the URL printed by Vite (default `http://localhost:3000` or alternate port if 3000 is busy).

## Deploy to Azure Static Web Apps
- Deploy the frontend to Azure Static Web Apps and include the `api/` folder as the Functions API in the SWA deployment (SWA will automatically wire `/api` to the Functions runtime).
- In the Azure Static Web App configuration (Configuration → Application settings), add the following settings:
  - `COSMOS_DB_ENDPOINT` = your Cosmos DB endpoint
  - `COSMOS_DB_KEY` = your Cosmos DB primary key
  - `COSMOS_DB_DATABASE` = `studio-portal` (or your database name)

When deployed to SWA, the frontend can call `/api/...` and Azure will route the requests to the Functions app with those environment variables available.

## Notes
- I replaced in-browser Cosmos DB direct access with a server-side API for security.
- The API code is in `api/tasks`, `api/ideas`, and `api/artists`.

If you want, I can now:
- Run a quick sanity check request against the local API endpoints,
- Or prepare an Azure Static Web App deployment config (GitHub Actions) for CI/CD.
