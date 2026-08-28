const isNode = typeof window === 'undefined';

const getAppParamValue = (paramName, { defaultValue = undefined, removeFromUrl = false } = {}) => {
  if (isNode) {
    return defaultValue;
  }
  const storageKey = `base44_${paramName.replace(/([A-Z])/g, '_$1').toLowerCase()}`;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get(paramName);
    if (removeFromUrl && searchParam) {
      urlParams.delete(paramName);
      const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}${window.location.hash}`;
      window.history.replaceState({}, document.title, newUrl);
    }
    if (searchParam) {
      localStorage.setItem(storageKey, searchParam);
      return searchParam;
    }
    if (defaultValue) {
      localStorage.setItem(storageKey, defaultValue);
      return defaultValue;
    }
    const storedValue = localStorage.getItem(storageKey);
    if (storedValue) {
      return storedValue;
    }
  } catch (e) {
    console.warn('Storage/URL param error:', e);
  }
  return defaultValue || null;
};

const getAppParams = () => {
  if (isNode) {
    return {
      appId: '',
      token: '',
      fromUrl: '',
      functionsVersion: '',
      appBaseUrl: '',
    };
  }

  if (getAppParamValue('clear_access_token') === 'true') {
    try {
      localStorage.removeItem('base44_access_token');
      localStorage.removeItem('token');
    } catch (e) {}
  }

  return {
    appId: getAppParamValue('app_id', { defaultValue: import.meta.env?.VITE_BASE44_APP_ID || '' }),
    token: getAppParamValue('access_token', { removeFromUrl: true }),
    fromUrl: getAppParamValue('from_url', { defaultValue: window.location.href }),
    functionsVersion: getAppParamValue('functions_version', { defaultValue: import.meta.env?.VITE_BASE44_FUNCTIONS_VERSION || '' }),
    appBaseUrl: getAppParamValue('app_base_url', { defaultValue: import.meta.env?.VITE_BASE44_APP_BASE_URL || '' }),
  };
};

export const appParams = getAppParams();
