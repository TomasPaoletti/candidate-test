import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipCache?: boolean;
  }

  export interface InternalAxiosRequestConfig {
    skipCache?: boolean;
    metadata?: {
      startTime?: number;
    };
  }
}
