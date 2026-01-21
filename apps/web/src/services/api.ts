import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * API Service para comunicación con el backend
 *
 * 📝 TODO: El candidato puede mejorar este servicio:
 * - Añadir interceptores para manejo de errores global
 * - Implementar retry logic
 * - Añadir logging de requests
 * - Implementar cache de requests
 */
export const api = {
  // === Student Endpoints ===

  getDashboard: async (studentId: string) => {
    const response = await apiClient.get(`/students/${studentId}/dashboard`);
    return response.data;
  },

  getCourses: async (studentId: string) => {
    const response = await apiClient.get(`/students/${studentId}/courses`);
    return response.data;
  },

  // TODO: Implementar cuando el candidato complete el endpoint ✅
  getStats: async (studentId: string) => {
    const response = await apiClient.get(`/students/${studentId}/stats`);
    return response.data;
  },

  // TODO: Implementar cuando el candidato complete el endpoint
  updatePreferences: async (studentId: string, preferences: any) => {
    const response = await apiClient.patch(
      `/students/${studentId}/preferences`,
      preferences,
    );
    return response.data;
  },

  // === Chat Endpoints ===

  sendChatMessage: async (data: {
    studentId: string;
    message: string;
    conversationId?: string;
  }) => {
    const response = await apiClient.post('/chat/message', data);
    return response.data;
  },

  startNewConversation: async (studentId: string, initialContext?: string) => {
    const response = await apiClient.post('/chat/conversation/new', {
      studentId,
      initialContext,
    });
    return response.data;
  },

  // TODO: Implementar cuando el candidato complete el endpoint  ✅
  getChatHistory: async (
    studentId: string,
    conversationId?: string,
    page?: number,
    limit?: number,
  ) => {
    const params: any = {};
    if (conversationId) params.conversationId = conversationId;
    if (page) params.page = page;
    if (limit) params.limit = limit;

    const response = await apiClient.get(`/chat/history/${studentId}`, {
      params,
    });
    return response.data;
  },

  // TODO: Implementar cuando el candidato complete el endpoint  ✅
  deleteChatHistory: async (studentId: string, conversationId: string) => {
    const response = await apiClient.delete(
      `/chat/history/${studentId}/${conversationId}`,
    );
    return response.data;
  },

  // TODO: Implementar streaming  ✅
  streamChatResponse: (
    data: {
      studentId: string;
      message: string;
      conversationId?: string;
    },
    callbacks: {
      onStart?: (data: {
        conversationId: string;
        userMessageId: string;
      }) => void;
      onToken?: (token: string) => void;
      onDone?: (data: {
        assistantMessageId: string;
        metadata: {
          tokensUsed: number;
          model: string;
          usedRAG: boolean;
          relevantChunks: number;
        };
      }) => void;
      onError?: (error: Error) => void;
    },
  ): { close: () => void } => {
    const params = new URLSearchParams({
      studentId: data.studentId,
      message: data.message,
      ...(data.conversationId && { conversationId: data.conversationId }),
    });

    const eventSource = new EventSource(
      `${apiClient.defaults.baseURL}/chat/stream?${params.toString()}`,
    );

    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);

        switch (parsed.type) {
          case 'start':
            callbacks.onStart?.({
              conversationId: parsed.conversationId,
              userMessageId: parsed.userMessageId,
            });
            break;

          case 'token':
            callbacks.onToken?.(parsed.content);
            break;

          case 'done':
            callbacks.onDone?.({
              assistantMessageId: parsed.assistantMessageId,
              metadata: parsed.metadata,
            });
            eventSource.close();
            break;

          case 'error':
            callbacks.onError?.(new Error(parsed.message));
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
        callbacks.onError?.(error as Error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      callbacks.onError?.(new Error('Error to connect server'));
      eventSource.close();
    };

    return {
      close: () => eventSource.close(),
    };
  },
};

// Interceptor para manejo de errores (básico)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: El candidato puede mejorar el manejo de errores
    console.error('API Error:', error.response?.data || error.message);

    // Transformar el error para mejor UX
    const message = error.response?.data?.message || 'Error de conexión';
    return Promise.reject(new Error(message));
  },
);
