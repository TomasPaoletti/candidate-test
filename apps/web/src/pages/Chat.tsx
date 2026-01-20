import { BookOpen, Bot, Hand, Lightbulb } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { ChatInput } from '../components/ChatInput';
import { ChatMessage } from '../components/ChatMessage';
import { useChat } from '../hooks/useChat';

interface ChatProps {
  studentId: string;
}

/**
 * 📝 TODO: El candidato debe completar esta página
 *
 * Funcionalidades a implementar:
 * 1. Cargar historial de conversación ✅
 * 2. Implementar streaming de respuestas (mostrar token por token) ✅
 * 3. Manejar errores de API ✅
 * 4. Implementar "Nueva conversación" ✅
 * 5. Auto-scroll al nuevo mensaje ✅
 * 6. Indicador de "escribiendo..." ✅
 *
 * Bonus:
 * - Persistir conversación en localStorage
 * - Botón para limpiar historial
 * - Exportar conversación
 */
export function Chat({ studentId }: ChatProps) {
  const { conversationId: urlConversationId } = useParams<{
    conversationId?: string;
  }>();
  const navigate = useNavigate();
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(urlConversationId ?? null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isStreaming,
    isLoadingHistory,
    error,
    sendWithStreaming,
    startNewConversation,
    isCreatingConversation,
  } = useChat({
    studentId: studentId!,
    conversationId: currentConversationId,
  });

  const handleNewConversation = async () => {
    try {
      const newConv = await startNewConversation();
      if (newConv) {
        navigate(`/chat/${newConv._id}`);
      }
    } catch (error) {}
  };

  // Auto-scroll cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <Container>
      <ChatHeader>
        <HeaderTitle>
          <HeaderIcon>
            <Bot size={32} />
          </HeaderIcon>
          <div>
            <h2>Asistente de Estudios</h2>
            <HeaderSubtitle>Pregúntame sobre tus cursos</HeaderSubtitle>
          </div>
        </HeaderTitle>

        <NewChatButton
          data-testid='button-new-conversation'
          disabled={isCreatingConversation}
          onClick={handleNewConversation}
        >
          + Nueva conversación
        </NewChatButton>
      </ChatHeader>

      <MessagesContainer>
        {isLoadingHistory ? (
          <LoadingHistoryContainer>
            <LoadingDots>
              <LoadingDot $delay={0} />
              <LoadingDot $delay={200} />
              <LoadingDot $delay={400} />
            </LoadingDots>
            <LoadingText>Cargando historial de la conversación...</LoadingText>
          </LoadingHistoryContainer>
        ) : messages.length === 0 ? (
          <WelcomeMessage>
            <WelcomeIcon>
              <Hand size={48} />
            </WelcomeIcon>
            <WelcomeTitle data-testid='title-new-conversation'>
              ¡Hola! Soy tu asistente de estudios
            </WelcomeTitle>
            <WelcomeText>
              Puedo ayudarte con:
              <ul>
                <li>Dudas sobre el contenido de tus cursos</li>
                <li>Técnicas de estudio y organización</li>
                <li>Motivación y consejos</li>
              </ul>
            </WelcomeText>
            <SuggestionButtons>
              <SuggestionButton
                onClick={() =>
                  sendWithStreaming(
                    '¿Cómo puedo mejorar mi técnica de estudio?',
                  )
                }
              >
                <Lightbulb size={14} /> Técnicas de estudio
              </SuggestionButton>
              <SuggestionButton
                onClick={() =>
                  sendWithStreaming('¿Qué curso me recomiendas empezar?')
                }
              >
                <BookOpen size={14} /> Recomendaciones
              </SuggestionButton>
            </SuggestionButtons>
          </WelcomeMessage>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                isStreaming={message.isStreaming}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </MessagesContainer>
      {error && (
        <ErrorText data-testid='error-chat'>
          Tuvimos un problema de red. Por favor intentalo nuevamente
        </ErrorText>
      )}
      <ChatInput
        onSend={(message) => sendWithStreaming(message)}
        disabled={isStreaming}
        placeholder='Escribe tu pregunta...'
      />
    </Container>
  );
}

const pulse = keyframes`
  0%, 60%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  30% {
    opacity: 1;
    transform: scale(1.2);
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 48px);
  background: var(--color-background);
  border-radius: var(--radius-lg);
  overflow: hidden;
`;

const ChatHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md) var(--spacing-lg);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  h2 {
    font-size: 16px;
    font-weight: 600;
  }
`;

const HeaderIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
`;

const HeaderSubtitle = styled.p`
  font-size: 13px;
  color: var(--color-text-secondary);
`;

const NewChatButton = styled.button`
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-size: 13px;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  &:disabled {
    background: var(--color-border);
    cursor: not-allowed;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-lg);
`;

const WelcomeMessage = styled.div`
  text-align: center;
  max-width: 400px;
  margin: var(--spacing-xl) auto;
`;

const WelcomeIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--spacing-md);
  color: var(--color-primary);
`;

const WelcomeTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: var(--spacing-sm);
`;

const WelcomeText = styled.div`
  color: var(--color-text-secondary);
  font-size: 14px;
  margin-bottom: var(--spacing-lg);

  ul {
    text-align: left;
    margin-top: var(--spacing-sm);
    padding-left: var(--spacing-lg);
  }

  li {
    margin-bottom: var(--spacing-xs);
  }
`;

const SuggestionButtons = styled.div`
  display: flex;
  gap: var(--spacing-sm);
  justify-content: center;
  flex-wrap: wrap;
`;

const SuggestionButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 13px;
  color: var(--color-text-primary);
  transition: all 0.2s ease;

  &:hover {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }
`;

const LoadingHistoryContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-md);
  padding: var(--spacing-xl);
  min-height: 200px;
`;

const LoadingDots = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const LoadingDot = styled.div<{ $delay?: number }>`
  width: 12px;
  height: 12px;
  background-color: var(--color-primary);
  border-radius: 50%;
  animation: ${pulse} 1.4s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay || 0}ms;
`;

const LoadingText = styled.p`
  color: var(--color-text-secondary);
  font-size: 14px;
  margin: 0;
`;

const ErrorText = styled.p`
  font-size: 14px;
  color: red;
`;
