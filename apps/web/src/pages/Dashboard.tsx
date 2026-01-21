import styled from 'styled-components';
import { DashboardCharts } from '../components/dashboard/DashboardCharts';
import { DashboardCourses } from '../components/dashboard/DashboardCourses';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';

interface DashboardProps {
  studentId: string;
}

/**
 * ✅ PARCIALMENTE IMPLEMENTADO - Página del Dashboard
 *
 * El candidato debe completar:
 * 1. Implementar el componente ActivityChart (gráfico de actividad semanal) ✅
 * 2. Implementar la lista de cursos con scroll horizontal ✅
 * 3. Añadir estados de loading y error ✅
 * 4. Implementar la sección de cursos recientes ✅
 */
export function Dashboard({ studentId }: DashboardProps) {
  return (
    <Container>
      <DashboardHeader studentId={studentId} />
      <DashboardCharts studentId={studentId} />
      <DashboardCourses studentId={studentId} />
    </Container>
  );
}

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;
