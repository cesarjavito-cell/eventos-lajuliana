import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createLocalEntityHandler } from '@/lib/localEntityStore';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

const rawBase44 = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: '',
  requiresAuth: false,
  appBaseUrl
});

const entityProxyCache = {};

const entitiesProxy = new Proxy(rawBase44.entities || {}, {
  get(target, prop) {
    if (typeof prop !== 'string') return target[prop];
    if (!entityProxyCache[prop]) {
      const original = target[prop];
      entityProxyCache[prop] = createLocalEntityHandler(prop, original);
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
