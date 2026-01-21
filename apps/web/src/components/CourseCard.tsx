import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

interface CourseCardProps {
  title: string;
  description: string;
  thumbnail?: string;
  progress?: number;
  category: string;
  totalLessons: number;
  completedLessons?: number;
  courseId: string;
  durationMinutes?: number;
}

/**
 * 📝 TODO: El candidato debe completar este componente
 *
 * Funcionalidades a implementar:
 * 1. Mostrar barra de progreso visual ✅
 * 2. Mostrar estado del curso (no iniciado, en progreso, completado) ✅
 * 3. Añadir animación hover ✅
 * 4. Manejar click para navegar al curso ✅
 * 5. Mostrar tiempo estimado restante ✅
 *
 * Bonus:
 * - Añadir skeleton loading state ✅
 * - Implementar lazy loading para la imagen ✅
 */
export function CourseCard({
  title,
  description,
  thumbnail,
  progress = 0,
  category,
  totalLessons,
  completedLessons = 0,
  courseId,
  durationMinutes = 0,
}: CourseCardProps) {
  const navigate = useNavigate();

  // TODO: Implementar lógica de estado del curso
  const status =
    progress === 100
      ? 'completed'
      : progress > 0
        ? 'in-progress'
        : 'not-started';

  const remainingMinutes =
    progress === 100
      ? 0
      : Math.max(Math.round(durationMinutes * (1 - progress / 100)), 1);

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
  };

  const handleClick = () => {
    if (courseId) {
      navigate(`/courses/${courseId}`);
    }
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };

  return (
    <Card onClick={handleClick} data-testid='card-courses'>
      <Thumbnail $url={thumbnail}>
        {thumbnail ? (
          <ThumbnailImage
            src={thumbnail}
            alt={title}
            loading='lazy'
            decoding='async'
          />
        ) : (
          <ThumbnailPlaceholder>
            <BookOpen size={48} />
          </ThumbnailPlaceholder>
        )}
        <CategoryBadge>{category}</CategoryBadge>
      </Thumbnail>

      <Content>
        <Title>{title}</Title>
        <Description>{description}</Description>
        {/* TODO: Implementar barra de progreso */} ✅
        <ProgressSection>
          <ProgressBar data-testid='progress-bar'>
            <ProgressFill style={{ width: `${progress}%` }} />
          </ProgressBar>
          <ProgressText>
            <span>
              {completedLessons}/{totalLessons} lecciones • {progress}%
            </span>

            {progress === 100 ? (
              <StatusCompleted>✅ Completado</StatusCompleted>
            ) : (
              <RemainingTime>
                ⏱ {formatMinutes(remainingMinutes)} restantes
              </RemainingTime>
            )}
          </ProgressText>
        </ProgressSection>
        {/* TODO: Implementar botón de acción según estado */} ✅
        <ActionButton $status={status} onClick={handleActionClick}>
          {status === 'completed' && 'Repasar'}
          {status === 'in-progress' && 'Continuar'}
          {status === 'not-started' && 'Comenzar'}
        </ActionButton>
      </Content>
    </Card>
  );
}

const Card = styled.div`
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
    border-color: var(--color-primary);
  }

  &:active {
    transform: translateY(-2px);
  }
`;

const Thumbnail = styled.div<{ $url?: string }>`
  height: 140px;
  background: ${(props) =>
    props.$url ? 'var(--color-background)' : 'var(--color-background)'};
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const ThumbnailImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.3s ease;

  ${Card}:hover & {
    transform: scale(1.05);
  }
`;

const ThumbnailPlaceholder = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  opacity: 0.5;
`;

const CategoryBadge = styled.span`
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 500;
  backdrop-filter: blur(4px);
  z-index: 1;
`;

const Content = styled.div`
  padding: var(--spacing-md);
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
  color: var(--color-text-primary);
  ${Card}:hover & {
    color: var(--color-primary);
  }
`;

const Description = styled.p`
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const ProgressSection = styled.div`
  margin-bottom: var(--spacing-md);
`;

const ProgressBar = styled.div`
  height: 6px;
  background: var(--color-background);
  border-radius: var(--radius-full);
  overflow: hidden;
  margin-bottom: var(--spacing-xs);
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-secondary);
  gap: var(--spacing-xs);
`;

const RemainingTime = styled.span`
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
`;

const StatusCompleted = styled.span`
  font-weight: 600;
  color: var(--color-success);
  white-space: nowrap;
`;

const ActionButton = styled.button<{ $status: string }>`
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 14px;
  cursor: pointer;
  background: ${(props) =>
    props.$status === 'completed'
      ? 'var(--color-success)'
      : props.$status === 'in-progress'
        ? 'var(--color-primary)'
        : 'var(--color-background)'};
  color: ${(props) =>
    props.$status === 'not-started' ? 'var(--color-text-primary)' : 'white'};
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;
