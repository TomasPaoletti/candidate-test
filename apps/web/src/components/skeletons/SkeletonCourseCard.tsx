import styled, { keyframes } from 'styled-components';

export function SkeletonCourseCard() {
  return (
    <SkeletonCard>
      <SkeletonThumbnail />
      <SkeletonContent>
        <SkeletonCategory />
        <SkeletonTitle />
        <SkeletonDescription />
        <SkeletonDescription />
        <SkeletonFooter>
          <SkeletonLessons />
          <SkeletonProgress />
        </SkeletonFooter>
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
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;
`;

const SkeletonThumbnail = styled.div`
  width: 100%;
  height: 160px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 160px;
  animation: ${shimmer} 1.5s infinite linear;
`;

const SkeletonContent = styled.div`
  padding: var(--spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  flex: 1;
`;

const SkeletonCategory = styled.div`
  height: 20px;
  width: 80px;
  border-radius: 12px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 20px;
  animation: ${shimmer} 1.5s infinite linear;
`;

const SkeletonTitle = styled.div`
  height: 20px;
  width: 85%;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 20px;
  animation: ${shimmer} 1.5s infinite linear;
  margin-top: var(--spacing-xs);
`;

const SkeletonDescription = styled.div`
  height: 14px;
  width: 100%;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 14px;
  animation: ${shimmer} 1.5s infinite linear;

  &:last-of-type {
    width: 70%;
  }
`;

const SkeletonFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: var(--spacing-sm);
`;

const SkeletonLessons = styled.div`
  height: 12px;
  width: 60px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 12px;
  animation: ${shimmer} 1.5s infinite linear;
`;

const SkeletonProgress = styled.div`
  height: 12px;
  width: 40px;
  border-radius: 4px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 12px;
  animation: ${shimmer} 1.5s infinite linear;
`;
