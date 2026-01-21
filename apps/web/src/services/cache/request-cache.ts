type CacheEntry = {
  data: any;
  expiry: number;
};

const cache = new Map<string, CacheEntry>();

const DEFAULT_TTL = 1000 * 60 * 5;

export function getCacheKey(config: any) {
  const { method, url, params } = config;
  return `${method}:${url}:${JSON.stringify(params ?? {})}`;
}

export function getCachedResponse(key: string) {
  const entry = cache.get(key);

  if (!entry) return null;

  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

export function setCachedResponse(key: string, data: any, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    expiry: Date.now() + ttl,
  });
}
