import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createLocalEntityHandler } from '@/lib/localEntityStore';

const { appId, token, functionsVersion, appBaseUrl } = appParams || {};

let rawBase44 = { entities: {}, auth: {}, functions: {} };

try {
  if (createClient) {
    rawBase44 = createClient({
      appId: appId || 'quinta-la-juliana',
      token: token || '',
      functionsVersion: functionsVersion || '',
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl: appBaseUrl || ''
    });
  }
} catch (e) {
  console.warn('Base44 client fallback mode:', e);
}

const entityProxyCache = {};

const entitiesProxy = new Proxy(rawBase44.entities || {}, {
  get(target, prop) {
    if (typeof prop !== 'string') return target[prop];
    if (!entityProxyCache[prop]) {
      entityProxyCache[prop] = createLocalEntityHandler(prop, target[prop]);
    }
    return entityProxyCache[prop];
  }
});

export const base44 = new Proxy(rawBase44, {
  get(target, prop) {
    if (prop === 'entities') {
      return entitiesProxy;
    }
    return target[prop];
  }
});
