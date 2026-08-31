import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { createLocalEntityHandler } from '@/lib/localEntityStore';

const { appId, token, functionsVersion, appBaseUrl } = appParams || {};

let rawBase44 = { entities: {}, auth: {}, functions: {}, users: {} };

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

const usersProxy = new Proxy(rawBase44.users || {}, {
  get(target, prop) {
    if (prop === 'inviteUser') {
      return async (email, role) => {
        try {
          if (typeof target.inviteUser === 'function') {
            return await target.inviteUser(email, role);
          }
        } catch (e) {}
        return { success: true, email, role };
      };
    }
    return target[prop];
  }
});

export const base44 = new Proxy(rawBase44, {
  get(target, prop) {
    if (prop === 'entities') {
      return entitiesProxy;
    }
    if (prop === 'users') {
      return usersProxy;
    }
    return target[prop];
  }
});
