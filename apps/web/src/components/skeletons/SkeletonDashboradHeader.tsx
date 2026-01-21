import styled, { keyframes } from 'styled-components';

export function SkeletonDashboardHeader() {
  return (
    <Header>
      <Greeting>
        <SkeletonTitle />
        <SkeletonSubtitle />
      </Greeting>
    </Header>
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

const Header = styled.header`
  margin-bottom: var(--spacing-xl);
`;

const Greeting = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
`;

const SkeletonTitle = styled.div`
  height: 32px;
  width: 250px;
  border-radius: 6px;
  background: linear-gradient(
    to right,
    #f0f0f0 0%,
    #e0e0e0 20%,
    #f0f0f0 40%,
    #f0f0f0 100%
  );
  background-size: 800px 32px;
  animation: ${shimmer} 1.5s infinite linear;
`;

const SkeletonSubtitle = styled.div`
  height: 20px;
  width: 200px;
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
`;
