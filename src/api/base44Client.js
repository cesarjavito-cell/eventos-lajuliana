import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const effectiveAppId = appId || '6a708dde640264104ee5861a';
const effectiveServerUrl = appBaseUrl || 'https://app.base44.com';

//Create a client with authentication required
export const base44 = createClient({
  appId: effectiveAppId,
  token,
  functionsVersion: functionsVersion || 'v1',
  serverUrl: effectiveServerUrl,
  requiresAuth: false,
  appBaseUrl: effectiveServerUrl
});
