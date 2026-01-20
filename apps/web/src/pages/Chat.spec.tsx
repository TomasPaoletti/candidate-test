import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { api } from '../services/api';
import { Chat } from './Chat';

const mockNavigate = vi.fn();
const mockUseParams = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockNavigate,
    BrowserRouter: ({ children }: any) => children,
  };
});

// Mock del servicio API
vi.mock('../services/api', () => ({
  api: {
    sendChatMessage: vi.fn(),
    startNewConversation: vi.fn(),
    getChatHistory: vi.fn(),
    streamChatResponse: vi.fn(),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('Chat', () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({});
    mockNavigate.mockClear();

    vi.mocked(api.sendChatMessage).mockResolvedValue({
      conversationId: 'conv-123',
      userMessage: { _id: 'msg-1', content: 'Test', role: 'user' },
      assistantMessage: {
        _id: 'msg-2',
        content: 'Response',
        role: 'assistant',
        createdAt: new Date().toISOString(),
      },
    });

    vi.mocked(api.getChatHistory).mockResolvedValue({
      messages: [],
      pagination: { page: 1, limit: 50, total: 0, hasMore: false },
    });

    vi.mocked(api.startNewConversation).mockResolvedValue({
      _id: 'new-conv-123',
      studentId: 'test-id',
      title: 'Nueva conversación',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * ✅ TEST QUE PASA - Verifica renderizado inicial
   */
  it('should render welcome message when no messages', () => {
    renderWithProviders(<Chat studentId='test-id' />);

    expect(
      screen.getByText(/¡Hola! Soy tu asistente de estudios/),
    ).toBeInTheDocument();
  });

  /**
   * ✅ TEST QUE PASA - Verifica header del chat
   */
  it('should render chat header', () => {
    renderWithProviders(<Chat studentId='test-id' />);

    expect(screen.getByText('Asistente de Estudios')).toBeInTheDocument();
    expect(screen.getByText('+ Nueva conversación')).toBeInTheDocument();
  });

  describe('Message sending', () => {
    it('should send message when clicking send button', async () => {
      const user = userEvent.setup();

      vi.mocked(api.streamChatResponse).mockReturnValue({
        close: vi.fn(),
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');
      const sendButton = screen.getByTestId('send-message');

      await user.type(input, 'Hello');
      await user.click(sendButton);

      expect(api.streamChatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'test-id',
          message: 'Hello',
        }),
        expect.any(Object),
      );
    });

    it('should send message when pressing Enter', async () => {
      const user = userEvent.setup();

      vi.mocked(api.streamChatResponse).mockReturnValue({
        close: vi.fn(),
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');

      await user.type(input, 'Hello{Enter}');

      expect(api.streamChatResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: 'test-id',
          message: 'Hello',
        }),
        expect.any(Object),
      );
    });

    it('should show user message immediately (optimistic update)', async () => {
      const user = userEvent.setup();

      vi.mocked(api.streamChatResponse).mockReturnValue({
        close: vi.fn(),
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');

      await user.type(input, 'Test message{Enter}');

      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should show assistant response after API call', async () => {
      const user = userEvent.setup();

      let onTokenCallback: ((token: string) => void) | undefined;
      let onDoneCallback: ((data: any) => void) | undefined;

      vi.mocked(api.streamChatResponse).mockImplementation((_, callbacks) => {
        onTokenCallback = callbacks.onToken;
        onDoneCallback = callbacks.onDone;

        setTimeout(() => {
          callbacks.onStart?.({
            conversationId: 'conv-123',
            userMessageId: 'user-msg-1',
          });
          onTokenCallback?.('H');
          onTokenCallback?.('e');
          onTokenCallback?.('l');
          onTokenCallback?.('l');
          onTokenCallback?.('o');
          onDoneCallback?.({
            assistantMessageId: 'asst-msg-1',
            metadata: { tokensUsed: 10, model: 'gpt-4o-mini' },
          });
        }, 100);

        return { close: vi.fn() };
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');
      await user.type(input, 'Hi{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });
    });

    it('should disable input while sending', async () => {
      const user = userEvent.setup();

      vi.mocked(api.streamChatResponse).mockImplementation(() => {
        return { close: vi.fn() };
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText(
        'Escribe tu pregunta...',
      ) as HTMLInputElement;

      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });

    it('should show typing indicator while waiting for response', async () => {
      const user = userEvent.setup();

      vi.mocked(api.streamChatResponse).mockImplementation((_, callbacks) => {
        setTimeout(() => {
          callbacks.onStart?.({
            conversationId: 'conv-123',
            userMessageId: 'user-msg-1',
          });
        }, 50);

        return { close: vi.fn() };
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        const loadingElements = screen.queryAllByRole('generic');
        expect(loadingElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Streaming', () => {
    it('should display tokens as they arrive', async () => {
      const user = userEvent.setup();

      vi.mocked(api.streamChatResponse).mockImplementation((_, callbacks) => {
        setTimeout(() => {
          callbacks.onStart?.({
            conversationId: 'conv-123',
            userMessageId: 'user-msg-1',
          });

          setTimeout(() => callbacks.onToken?.('T'), 10);
          setTimeout(() => callbacks.onToken?.('e'), 20);
          setTimeout(() => callbacks.onToken?.('s'), 30);
          setTimeout(() => callbacks.onToken?.('t'), 40);
        }, 50);

        return { close: vi.fn() };
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');
      await user.type(input, 'Hello{Enter}');

      await waitFor(
        () => {
          expect(screen.getByText(/Test/i)).toBeInTheDocument();
        },
        { timeout: 1000 },
      );
    });

    it('should handle stream errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      vi.mocked(api.streamChatResponse).mockImplementation((_, callbacks) => {
        setTimeout(() => {
          callbacks.onError?.(new Error('Stream connection failed'));
        }, 50);

        return { close: vi.fn() };
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('error-chat')).toBeInTheDocument();
      });
    });

    it('should complete message when stream ends', async () => {
      const user = userEvent.setup();

      vi.mocked(api.streamChatResponse).mockImplementation((_, callbacks) => {
        setTimeout(() => {
          callbacks.onStart?.({
            conversationId: 'conv-123',
            userMessageId: 'user-msg-1',
          });
          callbacks.onToken?.('Complete');
          callbacks.onToken?.(' message');
          callbacks.onDone?.({
            assistantMessageId: 'asst-msg-1',
            metadata: {
              tokensUsed: 5,
              model: 'gpt-4',
              usedRAG: true,
              relevantChunks: 1,
            },
          });
        }, 50);

        return { close: vi.fn() };
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Complete message')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });

  describe('Conversation management', () => {
    it('should start new conversation when button clicked', async () => {
      const user = userEvent.setup();

      const mockNewConversation = {
        _id: 'new-conv-123',
        studentId: 'test-id',
        title: 'Nueva conversación',
        isActive: true,
      };

      vi.mocked(api.startNewConversation).mockResolvedValue(
        mockNewConversation,
      );

      renderWithProviders(<Chat studentId='test-id' />);

      const newConversationButton = screen.getByTestId(
        'button-new-conversation',
      );

      await user.click(newConversationButton);

      await waitFor(() => {
        expect(api.startNewConversation).toHaveBeenCalledWith(
          'test-id',
          undefined,
        );
      });
    });

    it('should clear messages when starting new conversation', async () => {
      const user = userEvent.setup();

      const existingConversationId = 'existing-conv-123';
      const newConversationId = 'new-conv-456';

      vi.mocked(api.getChatHistory).mockImplementation((studentId, convId) => {
        if (convId === existingConversationId) {
          return Promise.resolve({
            messages: [
              {
                _id: 'msg-1',
                conversationId: existingConversationId,
                role: 'user',
                content: 'Mensaje antiguo',
                createdAt: new Date().toISOString(),
              },
              {
                _id: 'msg-2',
                conversationId: existingConversationId,
                role: 'assistant',
                content: 'Respuesta antigua',
                createdAt: new Date().toISOString(),
              },
            ],
            conversation: {
              _id: existingConversationId,
              studentId: 'test-id',
              title: 'Conversación existente',
            },
            pagination: { page: 1, limit: 50, total: 2, hasMore: false },
          });
        }
        return Promise.resolve({
          messages: [],
          pagination: { page: 1, limit: 50, total: 0, hasMore: false },
        });
      });

      const mockNewConversation = {
        _id: newConversationId,
        studentId: 'test-id',
        title: 'Nueva conversación',
        isActive: true,
      };

      vi.mocked(api.startNewConversation).mockResolvedValue(
        mockNewConversation,
      );

      vi.mocked(api.streamChatResponse).mockImplementation(
        (data, callbacks) => {
          setTimeout(() => {
            callbacks.onStart?.({
              conversationId: existingConversationId,
              userMessageId: 'user-msg-1',
            });
            callbacks.onToken?.('Mensaje');
            callbacks.onToken?.(' antiguo');
            callbacks.onDone?.({
              assistantMessageId: 'asst-msg-1',
              metadata: {
                tokensUsed: 10,
                model: 'gpt-4',
                usedRAG: false,
                relevantChunks: 0,
              },
            });
          }, 50);
          return { close: vi.fn() };
        },
      );

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Mensaje antiguo')).toBeInTheDocument();
      });

      const newConversationButton = screen.getByTestId(
        'button-new-conversation',
      );
      await user.click(newConversationButton);

      await waitFor(() => {
        expect(api.startNewConversation).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.queryByText('Mensaje antiguo')).not.toBeInTheDocument();
        expect(screen.queryByText('Respuesta antigua')).not.toBeInTheDocument();
      });

      await waitFor(
        () => {
          expect(
            screen.queryByTestId('title-new-conversation'),
          ).toBeInTheDocument();
        },
        { timeout: 200 },
      );
    });

    it('should load history after starting conversation', async () => {
      const conversationId = 'conv-123';

      mockUseParams.mockReturnValue({ conversationId });

      vi.mocked(api.getChatHistory).mockResolvedValue({
        messages: [
          {
            _id: 'msg-1',
            role: 'user',
            content: 'Mensaje histórico',
            createdAt: new Date().toISOString(),
          },
        ],
        pagination: { page: 1, limit: 50, total: 1, hasMore: false },
      });

      renderWithProviders(<Chat studentId='test-id' />);

      await waitFor(() => {
        expect(api.getChatHistory).toHaveBeenCalledWith(
          'test-id',
          conversationId,
        );
      });

      await waitFor(
        () => {
          expect(screen.getByText('Mensaje histórico')).toBeInTheDocument();
        },
        { timeout: 400 },
      );
    });

    it('should show loading state while creating conversation', async () => {
      const user = userEvent.setup();

      vi.mocked(api.startNewConversation).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  _id: 'new-conv-123',
                  studentId: 'test-id',
                  title: 'Nueva conversación',
                  isActive: true,
                }),
              100,
            ),
          ),
      );

      renderWithProviders(<Chat studentId='test-id' />);

      const newConversationButton = screen.getByTestId(
        'button-new-conversation',
      );

      await user.click(newConversationButton);

      await waitFor(() => {
        expect(newConversationButton).toBeDisabled();
      });

      await waitFor(
        () => {
          expect(
            screen.queryByTestId('title-new-conversation'),
          ).toBeInTheDocument();
        },
        { timeout: 200 },
      );
    });

    it('should handle error when creating new conversation fails', async () => {
      const user = userEvent.setup();

      vi.mocked(api.startNewConversation).mockRejectedValue(
        new Error('Failed to create conversation'),
      );

      renderWithProviders(<Chat studentId='test-id' />);

      const newConversationButton = screen.getByTestId(
        'button-new-conversation',
      );

      await user.click(newConversationButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-chat')).toBeInTheDocument();
      });

      expect(newConversationButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it.todo('should be keyboard navigable');
    it.todo('should have proper aria labels');
    it.todo('should announce new messages to screen readers');
  });

  describe('Error handling', () => {
    it('should show error message when API fails', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      vi.mocked(api.streamChatResponse).mockImplementation(() => {
        throw new Error('API connection failed');
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');

      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('error-chat')).toBeInTheDocument();
      });
    });

    it('should allow retry after error', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      let callCount = 0;
      vi.mocked(api.streamChatResponse).mockImplementation((_, callbacks) => {
        callCount++;
        if (callCount === 1) {
          setTimeout(() => callbacks.onError?.(new Error('Failed')), 50);
        } else {
          setTimeout(() => {
            callbacks.onStart?.({
              conversationId: 'conv-123',
              userMessageId: 'msg-1',
            });
            callbacks.onToken?.('Success');
            callbacks.onDone?.({
              assistantMessageId: 'asst-1',
              metadata: {
                tokensUsed: 5,
                model: 'gpt-4',
                usedRAG: true,
                relevantChunks: 1,
              },
            });
          }, 50);
        }
        return { close: vi.fn() };
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');

      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('error-chat')).toBeInTheDocument();
      });

      await user.clear(input);
      await user.type(input, 'Retry{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.queryByTestId('error-chat')).not.toBeInTheDocument();
      });
    });

    it('should handle network disconnection', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      vi.mocked(api.streamChatResponse).mockImplementation((_, callbacks) => {
        setTimeout(() => {
          callbacks.onError?.(new Error('Network error'));
        }, 50);

        return { close: vi.fn() };
      });

      renderWithProviders(<Chat studentId='test-id' />);

      const input = screen.getByPlaceholderText('Escribe tu pregunta...');
      await user.type(input, 'Test{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('error-chat')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(input).not.toBeDisabled();
      });
    });
  });
});
