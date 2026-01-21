import { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { apiClient } from '../api-client';
import {
  getCachedResponse,
  getCacheKey,
  setCachedResponse,
} from '../cache/request-cache';
import { ApiError } from './errors';
import { logger } from './logger';

type CachedResponseError = {
  __fromCache: true;
  data: any;
  config: any;
};

export function setupInterceptors() {
  // REQUEST
  apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (config.method === 'get' && !config.skipCache) {
        const key = getCacheKey(config);
        const cachedData = getCachedResponse(key);

        if (cachedData) {
          return Promise.reject({
            __fromCache: true,
            data: cachedData,
            config,
          });
        }
      }

      config.metadata = { startTime: Date.now() };

      logger.request({
        method: config.method,
        url: config.url,
        data: config.data,
        params: config.params,
      });

      return config;
    },
    (error) => Promise.reject(error),
  );

  // RESPONSE
  apiClient.interceptors.response.use(
    (response: AxiosResponse) => {
      if (response.config.method === 'get') {
        const key = getCacheKey(response.config);
        setCachedResponse(key, response.data);
      }

      const startTime = response.config.metadata?.startTime;
      const duration = startTime ? Date.now() - startTime : undefined;

      logger.response({
        status: response.status,
        url: response.config.url,
        duration,
      });

      return response;
    },

    (error: unknown) => {
      if (isCachedResponseError(error)) {
        return Promise.resolve({
          data: error.data,
          status: 200,
          config: error.config,
          headers: {},
        });
      }

      const axiosError = error as AxiosError;

      const status = axiosError.response?.status;
      const url = axiosError.config?.url;
      const message =
        (axiosError.response?.data as any)?.message || axiosError.message;

      logger.error({ status, url, message });

      return Promise.reject(new ApiError(message, status));
    },
  );
}

function isCachedResponseError(error: unknown): error is CachedResponseError {
  return Boolean(error && typeof error === 'object' && '__fromCache' in error);
}
