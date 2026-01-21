import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { api } from '../services/api';
import { Dashboard } from './Dashboard';

// Mock del servicio API
vi.mock('../services/api', () => ({
  api: {
    getDashboard: vi.fn(),
    getCourses: vi.fn(),
    getStats: vi.fn(),
  },
}));

const mockDashboard = {
  student: {
    id: '507f1f77bcf86cd799439011',
    name: 'María García',
    email: 'maria@test.com',
  },
  stats: {
    totalCourses: 5,
    completedCourses: 1,
    inProgressCourses: 2,
    totalTimeSpentMinutes: 565,
    totalTimeSpentFormatted: '9h 25m',
  },
  recentCourses: [],
};

const mockCourses = [
  {
    _id: '1',
    title: 'React desde Cero',
    description: 'Aprende React',
    category: 'Frontend',
    totalLessons: 20,
    progress: { progressPercentage: 70, completedLessons: 14 },
  },
];

const mockStats = {
  totalStudyHours: 10.3,
  completedVsInProgress: {
    completed: 1,
    inProgress: 2,
  },
  studyStreak: 3,
  weeklyAverageProgress: 52,
  timeByCategory: {
    'Base de Datos': 0,
    Backend: 90,
    Programación: 245,
    Frontend: 280,
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>,
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(api.getDashboard).mockResolvedValue(mockDashboard);
    vi.mocked(api.getCourses).mockResolvedValue(mockCourses);
    vi.mocked(api.getStats).mockResolvedValue(mockStats);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * ✅ TEST QUE PASA - Verifica que el dashboard renderiza el greeting
   */
  it('should render student greeting', async () => {
    renderWithProviders(<Dashboard studentId='507f1f77bcf86cd799439011' />);

    await screen.findByTestId('dashboard-title');
  });

  /**
   * ✅ TEST QUE PASA - Verifica que se muestran las stats cards
   */
  it('should render stats cards', async () => {
    renderWithProviders(<Dashboard studentId='507f1f77bcf86cd799439011' />);

    const statsCards = await screen.findAllByTestId('courses-stats-cards');
    expect(statsCards.length).toBeGreaterThan(0);
  });

  /**
   * ✅ TEST QUE PASA - Verifica estado de loading
   */
  it('should show loading state initially', () => {
    vi.mocked(api.getDashboard).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    renderWithProviders(<Dashboard studentId='test' />);

    const skeletons = screen.getAllByTestId('skeleton-card-stats');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should show error state when API fails', async () => {
    vi.mocked(api.getDashboard).mockRejectedValue(new Error('API Error'));

    renderWithProviders(<Dashboard studentId='test' />);

    await screen.findByTestId('error-container');
    expect(screen.getByTestId('button-retry')).toBeInTheDocument();
  });

  it('should render course cards', async () => {
    renderWithProviders(<Dashboard studentId='507f1f77bcf86cd799439011' />);

    await screen.findByTestId('card-courses');
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
  });

  it('should show empty state when no courses', async () => {
    vi.mocked(api.getCourses).mockResolvedValue([]);

    renderWithProviders(<Dashboard studentId='test' />);

    await screen.findByTestId('empty-text');
  });

  it('should render activity chart placeholder', async () => {
    renderWithProviders(<Dashboard studentId='507f1f77bcf86cd799439011' />);

    await screen.findByTestId('charts-title');
  });

  it('should be accessible (a11y)', async () => {
    renderWithProviders(<Dashboard studentId='507f1f77bcf86cd799439011' />);

    await screen.findByTestId('dashboard-title');

    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);

    const statsCards = screen.getAllByTestId('courses-stats-cards');
    expect(statsCards.length).toBeGreaterThan(0);

    const link = screen.getByTestId('link-courses');
    expect(link).toBeInTheDocument();
    expect(link.tagName).toBe('A');
  });

  it('should retry on error button click', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    vi.mocked(api.getDashboard)
      .mockRejectedValueOnce(new Error('API Error'))
      .mockResolvedValueOnce(mockDashboard);

    renderWithProviders(<Dashboard studentId='test' />);

    const retryButton = await screen.findByTestId('button-retry');

    await user.click(retryButton);

    await screen.findByTestId('dashboard-title');
  });

  it('should handle stats API failure independently', async () => {
    vi.mocked(api.getStats).mockRejectedValue(new Error('Stats Error'));

    renderWithProviders(<Dashboard studentId='test' />);

    await screen.findByTestId('dashboard-title');
    await screen.findByTestId('button-retry');
  });
});
