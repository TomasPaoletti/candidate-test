import { useQuery } from '@tanstack/react-query';
import styled from 'styled-components';
import { api } from '../../services/api';
import { CourseCard } from '../CourseCard';
import { ErrorCard } from '../ErrorCard';
import { SkeletonCourseCard } from '../skeletons/SkeletonCourseCard';

interface DashboardCoursesProps {
  studentId: string;
}

export function DashboardCourses({ studentId }: DashboardCoursesProps) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['courses', studentId],
    queryFn: () => api.getCourses(studentId),
  });

  return (
    <Section>
      <SectionHeader>
        <SectionTitle>Continúa donde lo dejaste</SectionTitle>
        <ViewAllLink data-testid='link-courses' href='/courses'>
          Ver todos →
        </ViewAllLink>
      </SectionHeader>

      {error ? (
        <ErrorCard
          title='Error al cargar cursos'
          message='No pudimos obtener tus cursos recientes'
          onRetry={() => refetch()}
        />
      ) : (
        <CoursesScrollContainer>
          {isLoading ? (
            <>
              <SkeletonCourseCard />
              <SkeletonCourseCard />
              <SkeletonCourseCard />
              <SkeletonCourseCard />
            </>
          ) : data && data.length > 0 ? (
            data.map((course: any) => (
              <CourseCard
                key={course._id}
                courseId={course._id}
                title={course.title}
                description={course.description}
                thumbnail={course.thumbnail}
                progress={course.progress?.progressPercentage || 0}
                category={course.category}
                totalLessons={course.totalLessons}
                completedLessons={course.progress?.completedLessons || 0}
                durationMinutes={course.durationMinutes}
              />
            ))
          ) : (
            <EmptyStateWrapper>
              <EmptyState>
                <EmptyText data-testid='empty-text'>
                  No tienes cursos todavía
                </EmptyText>
                <EmptySubtext>
                  ¡Explora el catálogo y comienza a aprender!
                </EmptySubtext>
              </EmptyState>
            </EmptyStateWrapper>
          )}
        </CoursesScrollContainer>
      )}
    </Section>
  );
}

const Section = styled.section`
  margin-bottom: var(--spacing-xl);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
`;

const ViewAllLink = styled.a`
  color: var(--color-primary);
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const CoursesScrollContainer = styled.div`
  display: flex;
  gap: var(--spacing-md);
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: var(--spacing-sm);
  padding-top: var(--spacing-sm);
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: var(--color-surface);
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;

    &:hover {
      background: var(--color-text-secondary);
    }
  }

  scrollbar-width: thin;
  scrollbar-color: var(--color-border) var(--color-surface);

  > * {
    flex: 0 0 300px;
    min-width: 300px;
  }
`;

const EmptyStateWrapper = styled.div`
  flex: 1 0 100%;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--spacing-xl);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px dashed var(--color-border);
`;

const EmptyText = styled.p`
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 var(--spacing-xs) 0;
`;

const EmptySubtext = styled.p`
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 0;
`;
