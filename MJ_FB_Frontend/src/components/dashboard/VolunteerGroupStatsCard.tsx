import { useEffect, useMemo, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import SectionCard from './SectionCard';
import type { VolunteerStats } from '../../api/volunteers';

const QUOTES = [
  'We appreciate your dedication!',
  'Your service makes a difference!',
  'Thanks for lending a helping hand!',
];

interface VolunteerGroupStatsCardProps {
  stats?: VolunteerStats;
}

export default function VolunteerGroupStatsCard({ stats }: VolunteerGroupStatsCardProps) {
  const [quote, setQuote] = useState('');
  const theme = useTheme();

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  const monthHours = stats?.monthHours ?? 0;
  const lifetimeHours = stats?.lifetimeHours ?? 0;
  const monthFamilies = stats?.monthFamiliesServed ?? 0;
  const monthPounds = stats?.monthPoundsHandled ?? 0;

  const hoursSummary = useMemo(() => {
    if (!stats) return null;
    if (lifetimeHours > 0) {
      return (
        <>
          <Box component="span" fontWeight="bold">
            {monthHours}
          </Box>{' '}
          /{' '}
          <Box component="span" fontWeight="bold">
            {lifetimeHours}
          </Box>{' '}
          hrs lifetime
        </>
      );
    }
    return (
      <>
        <Box component="span" fontWeight="bold">
          {monthHours}
        </Box>{' '}
        hrs this month
      </>
    );
  }, [stats, lifetimeHours, monthHours]);

  if (!stats) return null;

  const progress = lifetimeHours > 0
    ? Math.min(100, (monthHours / lifetimeHours) * 100)
    : monthHours > 0
    ? 100
    : 0;
  const chartData = [{ value: progress }];

  return (
    <SectionCard title="Community Impact">
      <Stack spacing={2} alignItems="center">
        <Typography>
          You helped move{' '}
          <Box component="span" fontWeight="bold">
            {monthPounds}
          </Box>{' '}
          lbs this month
        </Typography>
        <Typography>
          You supported{' '}
          <Box component="span" fontWeight="bold">
            {monthFamilies}
          </Box>{' '}
          families this month
        </Typography>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          data-testid="group-progress-gauge"
        >
          <RadialBarChart
            width={120}
            height={120}
            cx={60}
            cy={60}
            innerRadius={40}
            outerRadius={60}
            startAngle={90}
            endAngle={450}
            data={chartData}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={5}
              background
              fill={theme.palette.primary.main}
            />
          </RadialBarChart>
          {hoursSummary && (
            <Typography variant="body2" mt={1}>
              {hoursSummary}
            </Typography>
          )}
        </Box>
        {quote && <Typography variant="body2">{quote}</Typography>}
      </Stack>
    </SectionCard>
  );
}
