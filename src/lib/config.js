import { useEffect, useState } from 'react';
import { api } from './api.js';

// Server capabilities, fetched once per page load.
let configPromise = null;

export function loadConfig() {
  if (!configPromise) {
    configPromise = api('/config').catch(() => ({ photoChecks: false }));
  }
  return configPromise;
}

export function useConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    let alive = true;
    loadConfig().then((c) => alive && setConfig(c));
    return () => {
      alive = false;
    };
  }, []);
  return config;
}
