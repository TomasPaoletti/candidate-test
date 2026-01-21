import styled, { keyframes } from 'styled-components';

export function SkeletonChart() {
  return (
    <SkeletonContainer>
      <SkeletonBars>
        <SkeletonBar style={{ height: '60%' }} />
        <SkeletonBar style={{ height: '85%' }} />
        <SkeletonBar style={{ height: '45%' }} />
        <SkeletonBar style={{ height: '70%' }} />
      </SkeletonBars>
      <SkeletonAxis />
    </SkeletonContainer>
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

const SkeletonContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: var(--spacing-lg);
`;

const SkeletonBars = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  height: 220px;
  gap: var(--spacing-md);
`;

const SkeletonBar = styled.div`
  flex: 1;
  max-width: 80px;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 220px;
  animation: ${shimmer} 1.5s infinite linear;
`;

const SkeletonAxis = styled.div`
  height: 2px;
  width: 100%;
  background: #e0e0e0;
  margin-top: var(--spacing-sm);
`;
