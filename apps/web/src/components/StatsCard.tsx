import { ReactNode } from 'react';
import styled from 'styled-components';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
  subtitle?: string;
}

/**
 * IMPLEMENTADO - Tarjeta de estadistica individual
 */
export function StatsCard({
  title,
  value,
  icon,
  color = 'var(--color-primary)',
  subtitle,
}: StatsCardProps) {
  return (
    <Card
      data-testid='courses-stats-cards'
      role='group'
      aria-label={`${title}: ${value}`}
    >
      <IconWrapper $color={color}>{icon}</IconWrapper>
      <Content>
        <Title>{title}</Title>
        <Value>{value}</Value>
        {subtitle && <Subtitle>{subtitle}</Subtitle>}
      </Content>
    </Card>
  );
}

const Card = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
`;

const IconWrapper = styled.div<{ $color: string }>`
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: ${(props) => props.$color}15;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.$color};
  flex-shrink: 0;

  svg {
    width: 24px;
    height: 24px;
  }
`;

const Content = styled.div`
  flex: 1;
`;

const Title = styled.div`
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xs);
`;

const Value = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text-primary);
`;

const Subtitle = styled.div`
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: var(--spacing-xs);
`;
