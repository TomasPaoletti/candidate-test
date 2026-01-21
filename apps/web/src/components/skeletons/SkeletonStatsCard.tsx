import styled, { keyframes } from 'styled-components';

export function SkeletonStatsCard() {
  return (
    <SkeletonCard data-testid='skeleton-card-stats'>
      <SkeletonIcon />
      <SkeletonContent>
        <SkeletonTitle />
        <SkeletonValue />
        <SkeletonSubtitle />
      </SkeletonContent>
    </SkeletonCard>
  );
}

const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

const SkeletonCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  gap: var(--spacing-md);
  align-items: flex-start;
  min-height: 120px;
`;

const SkeletonIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 104px;
  animation: ${shimmer} 1.5s infinite linear;
`;

const SkeletonContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
`;

const SkeletonTitle = styled.div`
  height: 14px;
  width: 60%;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 104px;
  animation: ${shimmer} 1.5s infinite linear;
`;

const SkeletonValue = styled.div`
  height: 28px;
  width: 40%;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 104px;
  animation: ${shimmer} 1.5s infinite linear;
`;

const SkeletonSubtitle = styled.div`
  height: 12px;
  width: 50%;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 104px;
  animation: ${shimmer} 1.5s infinite linear;
`;
