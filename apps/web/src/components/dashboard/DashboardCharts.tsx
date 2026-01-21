import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { api } from '../../services/api';
import { transformCategoryData } from '../../utils/chartUtils';
import { ActivityChart } from '../ActivityChart';
import { ErrorCard } from '../ErrorCard';
import { SkeletonChart } from '../skeletons/SkeletonChart';

interface DashboardChartsProps {
  studentId: string;
}

export function DashboardCharts({ studentId }: DashboardChartsProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stats', studentId],
    queryFn: () => api.getStats(studentId),
  });

  const categoryData = data ? transformCategoryData(data.timeByCategory) : [];

  return (
    <Section>
      <SectionTitle data-testid='charts-title'>
        Tiempo de Estudio por Categoría
      </SectionTitle>
      <ChartContainer>
        {isLoading ? (
          <SkeletonChart />
        ) : error ? (
          <ErrorCard
            title='Error al cargar actividad'
            message='No pudimos cargar tu gráfico de actividad'
            onRetry={() => refetch()}
            compact
          />
        ) : categoryData.length > 0 ? (
          <ActivityChart data={categoryData} />
        ) : (
          <EmptyState>
            <EmptyText>No hay datos de estudio disponibles</EmptyText>
            <EmptySubtext>
              Comienza un curso para ver tu actividad aquí
            </EmptySubtext>
          </EmptyState>
        )}
      </ChartContainer>
    </Section>
  );
}

const Section = styled.section`
  margin-bottom: var(--spacing-xl);
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: var(--spacing-md);
`;

const ChartContainer = styled.div`
  background: white;
  border-radius: 12px;
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyState = styled.div`
  text-align: center;
  color: var(--color-text-secondary);
`;

const EmptyText = styled.p`
  font-size: 16px;
  margin: 0 0 var(--spacing-xs) 0;
`;

const EmptySubtext = styled.p`
  font-size: 14px;
  margin: 0;
  opacity: 0.7;
`;
