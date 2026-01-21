import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle, Clock, Target } from 'lucide-react';
import styled from 'styled-components';
import { api } from '../../services/api';
import { ErrorCard } from '../ErrorCard';
import { SkeletonDashboardHeader } from '../skeletons/SkeletonDashboradHeader';
import { SkeletonStatsCard } from '../skeletons/SkeletonStatsCard';
import { StatsCard } from '../StatsCard';

interface DashboardHeaderProps {
  studentId: string;
}

export function DashboardHeader({ studentId }: DashboardHeaderProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', studentId],
    queryFn: () => api.getDashboard(studentId),
  });

  if (error) {
    return (
      <ErrorCard
        title='Error al cargar información'
        message='No pudimos cargar tu información personal y estadísticas'
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <>
      {isLoading ? (
        <SkeletonDashboardHeader />
      ) : (
        <Header>
          <Greeting>
            <h1 data-testid='dashboard-title'>¡Hola, {data?.student.name}!</h1>
            <Subtitle>Aquí está tu progreso de hoy</Subtitle>
          </Greeting>
        </Header>
      )}

      <StatsGrid>
        {isLoading ? (
          <>
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
            <SkeletonStatsCard />
          </>
        ) : (
          <>
            <StatsCard
              title='Cursos Activos'
              value={data?.stats.inProgressCourses || 0}
              icon={<BookOpen size={24} />}
              color='var(--color-primary)'
            />
            <StatsCard
              title='Cursos Completados'
              value={data?.stats.completedCourses || 0}
              icon={<CheckCircle size={24} />}
              color='var(--color-success)'
            />
            <StatsCard
              title='Tiempo de Estudio'
              value={data?.stats.totalTimeSpentFormatted || '0h 0m'}
              icon={<Clock size={24} />}
              color='var(--color-secondary)'
              subtitle='Total acumulado'
            />
            <StatsCard
              title='Total Cursos'
              value={data?.stats.totalCourses || 0}
              icon={<Target size={24} />}
              color='var(--color-primary)'
            />
          </>
        )}
      </StatsGrid>
    </>
  );
}

const Header = styled.header`
  margin-bottom: var(--spacing-xl);
`;

const Greeting = styled.div`
  h1 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: var(--spacing-xs);
  }
`;

const Subtitle = styled.p`
  color: var(--color-text-secondary);
  font-size: 16px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
`;
