import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ActivityData {
  category: string;
  minutes: number;
  hours: number;
}

interface ActivityChartProps {
  data: ActivityData[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  const primaryColor = 'var(--color-primary)';

  const categoryColors: { [key: string]: string } = {
    Frontend: '#3b82f6',
    Backend: '#10b981',
    Programación: '#f59e0b',
    'Base de Datos': '#8b5cf6',
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          style={{
            backgroundColor: 'white',
            padding: '12px',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '4px' }}>
            {data.category}
          </p>
          <p
            style={{
              margin: 0,
              color: categoryColors[data.category] || primaryColor,
            }}
          >
            {data.hours > 0 && `${data.hours}h `}
            {data.minutes}min
          </p>
          <p
            style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--color-text-secondary)',
            }}
          >
            Total: {Math.floor(data.totalMinutes / 60)}h{' '}
            {data.totalMinutes % 60}min
          </p>
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => `${value}h`;

  // Calcular horas decimales para el gráfico
  const chartData = data.map((item) => ({
    ...item,
    totalHours: item.minutes / 60,
    totalMinutes: item.minutes,
  }));

  return (
    <ResponsiveContainer width='100%' height='100%'>
      <BarChart
        data={chartData}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray='3 3' stroke='var(--color-border)' />
        <XAxis
          dataKey='category'
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          tickLine={{ stroke: 'var(--color-border)' }}
          textAnchor='middle'
          height={60}
        />
        <YAxis
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }}
          tickLine={{ stroke: 'var(--color-border)' }}
          tickFormatter={formatYAxis}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(0,0,0,0.05)' }}
        />
        <Bar dataKey='totalHours' radius={[8, 8, 0, 0]} maxBarSize={80}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={categoryColors[entry.category] || primaryColor}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
