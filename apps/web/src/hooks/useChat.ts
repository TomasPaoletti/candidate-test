import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface UseChatOptions {
  studentId: string;
  conversationId?: string | null;
}

/**
 * 📝 TODO: El candidato debe completar este hook
 *
 * Funcionalidades a implementar:
 * 1. Manejo de estado de mensajes ✅
 * 2. Integración con streaming de respuestas ✅
 * 3. Persistencia de conversación
 * 4. Manejo de errores ✅
 * 5. Nueva conversación ✅
 *
 * Este hook debe abstraer toda la lógica del chat
 * para que el componente Chat sea más simple
 */
export function useChat({ studentId, conversationId }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(false);
  const eventSourceRef = useRef<{ close: () => void } | null>(null);
  const queryClient = useQueryClient();

  const historyQuery = useQuery({
    queryKey: ['chatHistory', studentId, conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      return api.getChatHistory(studentId, conversationId);
    },
    enabled: !!conversationId,
    staleTime: 30000,
    retry: 1,
  });

  const handleOnError = useCallback((error: Error) => {
    console.error('Error in chat', error);
    setError(true);
  }, []);

  // Mutation para enviar mensajes
  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      return api.sendChatMessage({
        studentId,
        message,
        conversationId: conversationId || undefined,
      });
    },
    onMutate: async (message) => {
      // Optimistic update
      setError(false);
      const tempId = `temp-${Date.now()}`;
      const userMessage: Message = {
        id: tempId,
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      return { tempId };
    },
    onSuccess: (data, _, context) => {
      // Añadir respuesta del asistente
      const assistantMessage: Message = {
        id: data.assistantMessage._id,
        role: 'assistant',
        content: data.assistantMessage.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: (error: Error) => {
      handleOnError(error);
    },
  });

  // TODO: Implementar streaming de respuestas ✅
  const sendWithStreaming = useCallback(
    async (message: string) => {
      setError(false);
      const tempUserId = `temp-user-${Date.now()}`;
      const userMessage: Message = {
        id: tempUserId,
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const tempAssistantId = `temp-assistant-${Date.now()}`;
      const assistantMessage: Message = {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      setIsStreaming(true);

      try {
        eventSourceRef.current = api.streamChatResponse(
          {
            studentId,
            message,
            conversationId: conversationId || undefined,
          },
          {
            onStart: (data) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempUserId
                    ? { ...msg, id: data.userMessageId }
                    : msg,
                ),
              );
            },

            onToken: (token) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempAssistantId
                    ? { ...msg, content: msg.content + token }
                    : msg,
                ),
              );
            },

            onDone: (data) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempAssistantId
                    ? {
                        ...msg,
                        id: data.assistantMessageId,
                        isStreaming: false,
                      }
                    : msg,
                ),
              );

              setIsStreaming(false);
              eventSourceRef.current = null;

              queryClient.invalidateQueries({
                queryKey: ['chatHistory', studentId, conversationId],
              });
            },

            onError: (error) => {
              setMessages((prev) =>
                prev.filter((msg) => msg.id !== tempAssistantId),
              );

              setIsStreaming(false);
              eventSourceRef.current = null;
              handleOnError(error);
            },
          },
        );
      } catch (error: unknown) {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempAssistantId));

        setIsStreaming(false);
        handleOnError(error as Error);
      }
    },
    [studentId, conversationId, handleOnError],
  );

  // TODO: Implementar nueva conversación ✅
  const newConversationMutation = useMutation({
    mutationFn: (initialContext?: string) =>
      api.startNewConversation(studentId, initialContext),
    onSuccess: (data) => {
      setMessages([]);

      queryClient.invalidateQueries({
        queryKey: ['chatHistory', studentId, conversationId],
      });

      return data;
    },
    onError: (error: Error) => {
      handleOnError(error);
    },
  });

  useEffect(() => {
    if (historyQuery.data?.messages) {
      const transformedMessages: Message[] = historyQuery.data.messages.map(
        (msg: any) => ({
          id: msg._id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          isStreaming: false,
        }),
      );
      setMessages(transformedMessages);
    }
  }, [historyQuery.data]);

  return {
    messages,
    conversationId,
    isStreaming,
    isLoadingHistory: historyQuery.isLoading,
    historyError: historyQuery.error,
    error,
    isCreatingConversation: newConversationMutation.isPending,
    sendWithStreaming,
    startNewConversation: (initialContext?: string) =>
      newConversationMutation.mutateAsync(initialContext),
    clearMessages: () => setMessages([]),
  };
}
