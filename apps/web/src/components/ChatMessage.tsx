import { Bot, ChevronDown, ChevronUp, User } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
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
 * 1. Formatear el contenido (markdown básico, code blocks) ✅
 * 2. Mostrar indicador de "escribiendo" cuando isLoading=true ✅
 * 3. Añadir animación de entrada para mensajes nuevos
 * 4. Mostrar timestamp formateado ✅
 * 5. Manejar mensajes largos (expandir/colapsar) ✅
 *
 * Bonus:
 * - Soporte para syntax highlighting en code blocks
 * - Botón para copiar código
 * - Reacciones a mensajes
 */

const MAX_LENGTH = 500;

export function ChatMessage({
  role,
  content,
  timestamp,
  isStreaming,
}: ChatMessageProps) {
  // TODO: Implementar formateo de markdown ✅

  const [isExpanded, setIsExpanded] = useState(true);

  const showLoading = role === 'assistant' && isStreaming && !content;
  const shouldTruncate = content.length > MAX_LENGTH;

  const displayContent =
    shouldTruncate && !isExpanded && !isStreaming
      ? content.slice(0, MAX_LENGTH) + '...'
      : content;

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
            <MessageText>
              <ReactMarkdown>{displayContent}</ReactMarkdown>
            </MessageText>

            {shouldTruncate && !isStreaming && (
              <ExpandButton onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? (
                  <>
                    <ChevronUp size={14} />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    Ver más
                  </>
                )}
              </ExpandButton>
            )}
            {timestamp && (
              <Timestamp $role={role}>{formatTime(timestamp)}</Timestamp>
            )}
          </>
        )}
      </MessageContent>
    </Container>
  );
}

// TODO: Mejorar formateo de tiempo ✅
function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  // If today
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;

  // If today but hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && now.getDate() === date.getDate()) {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // If yesterday or before
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
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

const MessageText = styled.div`
  margin: 0;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;

  ul,
  ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  p {
    margin: 8px 0;

    &:first-child {
      margin-top: 0;
    }

    &:last-child {
      margin-bottom: 0;
    }
  }

  code {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
    font-family: 'Consolas', 'Monaco', monospace;
  }

  pre {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 8px 0;

    code {
      background: none;
      padding: 0;
    }
  }
`;

const ExpandButton = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: inherit;
  font-size: 0.875rem;
  cursor: pointer;
  padding: 8px 0 4px 0;
  margin-top: 8px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  font-weight: 500;

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline: none;
    opacity: 1;
  }

  svg {
    flex-shrink: 0;
  }
`;

const Timestamp = styled.span<{ $role: 'user' | 'assistant' }>`
  display: block;
  font-size: 0.75rem;
  color: ${({ $role }) =>
    $role === 'assistant' ? 'var(--color-text-secondary)' : 'white'};
  margin-top: 4px;
  opacity: 0.7;
`;
