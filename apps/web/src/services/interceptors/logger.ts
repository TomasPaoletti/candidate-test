const isDev = import.meta.env.DEV;

interface LogRequest {
  method?: string;
  url?: string;
  data?: any;
  params?: any;
}

interface LogResponse {
  status?: number;
  url?: string;
  duration?: number;
}

export const logger = {
  request: (config: LogRequest) => {
    if (!isDev) return;

    console.groupCollapsed(
      `%cAPI Request: ${config.method?.toUpperCase()} ${config.url}`,
      'color: #4CAF50; font-weight: bold;',
    );

    if (config.params) console.log('Params:', config.params);
    if (config.data) console.log('Body:', config.data);

    console.groupEnd();
  },

  response: (response: LogResponse) => {
    if (!isDev) return;

    console.log(
      `%cAPI Response: ${response.status} ${response.url} (${response.duration}ms)`,
      'color: #2196F3; font-weight: bold;',
    );
  },

  error: (error: { status?: number; url?: string; message?: string }) => {
    if (!isDev) return;

    console.error(
      `%cAPI Error: ${error.status ?? 'NETWORK'} ${error.url}`,
      'color: #F44336; font-weight: bold;',
      error.message,
    );
  },
};
