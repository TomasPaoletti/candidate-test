import { Loader2, Send, Smile } from 'lucide-react';
import { KeyboardEvent, useEffect, useRef, useState } from 'react';
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
 * 1. Enviar mensaje con Enter (Shift+Enter para nueva línea) ✅
 * 2. Auto-resize del textarea según contenido ✅
 * 3. Límite de caracteres con contador ✅
 * 4. Estado de disabled mientras se envía ✅
 * 5. Limpiar input después de enviar ✅
 *
 * Bonus:
 * - Soporte para emojis ✅
 * - Historial de mensajes con flechas arriba/abajo
 * - Indicador de caracteres restantes ✅
 */

const MAX_CHARS = 2000;

const COMMON_EMOJIS = [
  '😊',
  '👍',
  '❤️',
  '😂',
  '🎉',
  '🤔',
  '👋',
  '🔥',
  '✨',
  '💡',
];

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Escribe tu mensaje...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const charsRemaining = MAX_CHARS - message.length;

  // TODO: Implementar manejo de teclas (Enter para enviar, Shift+Enter para nueva línea)
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (trimmed && !disabled && trimmed.length <= MAX_CHARS) {
      onSend(trimmed);

      setMessage('');
      setShowEmojiPicker(false);
    }
  };

  const handleChange = (value: string) => {
    if (value.length <= MAX_CHARS) {
      setMessage(value);
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [message]);

  return (
    <Container>
      <InputWrapper>
        <TextArea
          ref={textareaRef}
          id='textarea-input'
          value={message}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          $hasContent={message.length > 0}
        />
        {/* TODO: Añadir contador de caracteres */} ✅
        <CharCounter $warning={charsRemaining < 100}>
          {charsRemaining}
        </CharCounter>
        <EmojiButton
          type='button'
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={disabled}
          title='Agregar emoji'
        >
          <Smile size={20} />
        </EmojiButton>
        {showEmojiPicker && (
          <EmojiPicker>
            {COMMON_EMOJIS.map((emoji) => (
              <EmojiOption
                key={emoji}
                onClick={() => {
                  handleChange(message + emoji);
                  setShowEmojiPicker(false);
                  textareaRef.current?.focus();
                }}
              >
                {emoji}
              </EmojiOption>
            ))}
          </EmojiPicker>
        )}
      </InputWrapper>

      <SendButton
        data-testid='send-message'
        onClick={handleSend}
        disabled={disabled || !message.trim() || message.length > MAX_CHARS}
        title={disabled ? 'Enviando...' : 'Enviar mensaje'}
      >
        {disabled ? (
          <Loader2 size={16} className='spinner' />
        ) : (
          <Send size={16} />
        )}
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

const TextArea = styled.textarea<{ $hasContent: boolean }>`
  width: 100%;
  padding: 12px ${({ $hasContent }) => ($hasContent ? '80px' : '50px')} 12px
    var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: border-color 0.2s ease;
  min-height: 46px;
  max-height: 120px;
  overflow-y: auto;
  line-height: 20px;

  &:focus {
    border-color: var(--color-primary);
  }

  &:disabled {
    background: var(--color-background);
    cursor: not-allowed;
  }

  /* TODO: Implementar auto-resize */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }
`;

const CharCounter = styled.span<{ $warning: boolean }>`
  position: absolute;
  right: 50px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: ${({ $warning }) =>
    $warning ? 'var(--color-error, #e74c3c)' : 'var(--color-text-secondary)'};
  font-weight: 500;
  pointer-events: none;
`;

const EmojiButton = styled.button`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--color-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const EmojiPicker = styled.div`
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
`;

const EmojiOption = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius-sm);
  transition: background 0.2s ease;

  &:hover {
    background: var(--color-background);
  }
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
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: var(--color-primary-dark);
  }

  &:disabled {
    background: var(--color-border);
    cursor: not-allowed;
  }

  .spinner {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;
