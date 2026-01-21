import { AlertCircle, RefreshCw } from 'lucide-react';
import styled from 'styled-components';

interface ErrorCardProps {
  title: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean; // Para card mas pequeña
}

export function ErrorCard({
  title,
  message,
  onRetry,
  compact = false,
}: ErrorCardProps) {
  return (
    <ErrorContainer data-testid='error-container' $compact={compact}>
      <ErrorIcon $compact={compact}>
        <AlertCircle size={compact ? 32 : 48} />
      </ErrorIcon>
      <ErrorContent>
        <ErrorTitle $compact={compact}>{title}</ErrorTitle>
        <ErrorMessage $compact={compact}>{message}</ErrorMessage>
        {onRetry && (
          <RetryButton data-testid='button-retry' onClick={onRetry}>
            <RefreshCw size={16} />
            Reintentar
          </RetryButton>
        )}
      </ErrorContent>
    </ErrorContainer>
  );
}

const ErrorContainer = styled.div<{ $compact?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: ${({ $compact }) =>
    $compact ? 'var(--spacing-md)' : 'var(--spacing-xl)'};
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  min-height: ${({ $compact }) => ($compact ? '120px' : '200px')};
`;

const ErrorIcon = styled.div<{ $compact?: boolean }>`
  color: var(--color-error);
  margin-bottom: ${({ $compact }) =>
    $compact ? 'var(--spacing-sm)' : 'var(--spacing-md)'};
  opacity: 0.8;
`;

const ErrorContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--spacing-sm);
`;

const ErrorTitle = styled.h3<{ $compact?: boolean }>`
  font-size: ${({ $compact }) => ($compact ? '16px' : '18px')};
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
`;

const ErrorMessage = styled.p<{ $compact?: boolean }>`
  font-size: ${({ $compact }) => ($compact ? '13px' : '14px')};
  color: var(--color-text-secondary);
  margin: 0;
  max-width: ${({ $compact }) => ($compact ? '250px' : '400px')};
  line-height: 1.5;
`;

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: 10px 20px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: var(--spacing-xs);

  &:hover {
    background: var(--color-primary-dark);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    transition: transform 0.3s;
  }

  &:hover svg {
    transform: rotate(180deg);
  }
`;
