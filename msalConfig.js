import { PublicClientApplication } from '@azure/msal-browser';

// MSAL Configuration
export const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AZURE_CLIENT_ID || 'your-client-id',
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AZURE_TENANT_ID || 'your-tenant-id'}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

// Create MSAL instance
export const msalInstance = new PublicClientApplication(msalConfig);
