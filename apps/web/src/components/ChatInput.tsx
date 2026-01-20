import { KeyboardEvent, useState } from 'react';
import styled from 'styled-components';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * 📝 TODO: El candidato debe completar este componente
 *
 * Funcionalidades a implementar:
 * 1. Enviar mensaje con Enter (Shift+Enter para nueva línea)
 * 2. Auto-resize del textarea según contenido
 * 3. Límite de caracteres con contador
 * 4. Estado de disabled mientras se envía
 * 5. Limpiar input después de enviar
 *
 * Bonus:
 * - Soporte para emojis
 * - Historial de mensajes con flechas arriba/abajo
 * - Indicador de caracteres restantes
 */
export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Escribe tu mensaje...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  // TODO: Implementar manejo de teclas (Enter para enviar, Shift+Enter para nueva línea)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setMessage('');
    }
  };

  return (
    <Container>
      <InputWrapper>
        <TextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
        />
        {/* TODO: Añadir contador de caracteres */}
      </InputWrapper>

      <SendButton
        data-testid='send-message'
        onClick={handleSend}
        disabled={disabled || !message.trim()}
      >
        {/* TODO: Cambiar icono cuando está enviando */}➤
      </SendButton>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
`;

const InputWrapper = styled.div`
  flex: 1;
  position: relative;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
  min-height: 44px;
  max-height: 120px;

  &:focus {
    border-color: var(--color-primary);
  }

  &:disabled {
    background: var(--color-background);
    cursor: not-allowed;
  }

  /* TODO: Implementar auto-resize */
`;

const SendButton = styled.button`
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--color-primary);
  color: white;
  border: none;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }

  &:disabled {
    background: var(--color-border);
    cursor: not-allowed;
  }
`;
