import { Bot, User } from 'lucide-react';
import styled, { keyframes } from 'styled-components';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
}

/**
 * 📝 TODO: El candidato debe completar este componente
 *
 * Funcionalidades a implementar:
 * 1. Formatear el contenido (markdown básico, code blocks)
 * 2. Mostrar indicador de "escribiendo" cuando isLoading=true ✅
 * 3. Añadir animación de entrada para mensajes nuevos
 * 4. Mostrar timestamp formateado
 * 5. Manejar mensajes largos (expandir/colapsar)
 *
 * Bonus:
 * - Soporte para syntax highlighting en code blocks
 * - Botón para copiar código
 * - Reacciones a mensajes
 */
export function ChatMessage({
  role,
  content,
  timestamp,
  isStreaming,
}: ChatMessageProps) {
  // TODO: Implementar formateo de markdown

  const showLoading = role === 'assistant' && isStreaming && !content;

  return (
    <Container $role={role}>
      <Avatar $role={role}>
        {role === 'user' ? <User size={18} /> : <Bot size={18} />}
      </Avatar>

      <MessageContent $role={role}>
        {showLoading ? (
          <LoadingIndicator>
            <Dot $delay={0} />
            <Dot $delay={200} />
            <Dot $delay={400} />
          </LoadingIndicator>
        ) : (
          <>
            <MessageText>{content}</MessageText>
            {timestamp && <Timestamp>{formatTime(timestamp)}</Timestamp>}
          </>
        )}
      </MessageContent>
    </Container>
  );
}

// TODO: Mejorar formateo de tiempo
function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const bounce = keyframes`
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Container = styled.div<{ $role: 'user' | 'assistant' }>`
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  justify-content: ${({ $role }) =>
    $role === 'user' ? 'flex-end' : 'flex-start'};
  animation: ${fadeIn} 0.3s ease-out;
`;

const Avatar = styled.div<{ $role: 'user' | 'assistant' }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: ${({ $role }) =>
    $role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)'};
  color: ${({ $role }) =>
    $role === 'user' ? 'white' : 'var(--color-text-secondary)'};
  border: ${({ $role }) =>
    $role === 'assistant' ? '1px solid var(--color-border)' : 'none'};
  order: ${({ $role }) => ($role === 'user' ? 1 : 0)};
`;

const MessageContent = styled.div<{ $role: 'user' | 'assistant' }>`
  max-width: 70%;
  background-color: ${({ $role }) =>
    $role === 'user' ? 'var(--color-primary)' : 'var(--color-surface)'};
  color: ${({ $role }) =>
    $role === 'user' ? 'white' : 'var(--color-text-primary)'};
  border-radius: 12px;
  padding: 12px 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: ${({ $role }) =>
    $role === 'assistant' ? '1px solid var(--color-border)' : 'none'};
`;

const LoadingIndicator = styled.div`
  display: flex;
  gap: 6px;
  padding: 4px 0;
  align-items: center;
  min-height: 24px;
`;

const Dot = styled.div<{ $delay?: number }>`
  width: 8px;
  height: 8px;
  background-color: var(--color-text-secondary);
  border-radius: 50%;
  animation: ${bounce} 1.4s ease-in-out infinite;
  animation-delay: ${({ $delay }) => $delay || 0}ms;
`;

const MessageText = styled.p`
  margin: 0;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

const Timestamp = styled.span`
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-top: 4px;
  opacity: 0.7;
`;
