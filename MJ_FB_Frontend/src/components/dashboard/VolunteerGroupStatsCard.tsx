import { useEffect, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import SectionCard from './SectionCard';
import { getVolunteerGroupStats, type VolunteerGroupStats } from '../../api/volunteers';

const QUOTES = [
  'We appreciate your dedication!',
  'Your service makes a difference!',
  'Thanks for lending a helping hand!',
];

const HIGHLIGHT_OF_MONTH = 'Canned Food Drive exceeded goals!';

export default function VolunteerGroupStatsCard() {
  const [stats, setStats] = useState<VolunteerGroupStats>();
  const [quote, setQuote] = useState('');
  const theme = useTheme();

  useEffect(() => {
    getVolunteerGroupStats().then(setStats).catch(() => {});
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  if (!stats) return null;

  const progress = stats.monthHoursGoal
    ? Math.min(100, (stats.monthHours / stats.monthHoursGoal) * 100)
    : 0;
  const chartData = [{ value: progress }];

  return (
    <SectionCard title="Community Impact">
      <Stack spacing={2} alignItems="center">
        {HIGHLIGHT_OF_MONTH && (
          <Typography fontWeight="bold">{HIGHLIGHT_OF_MONTH}</Typography>
        )}
        <Typography>{`Volunteers distributed ${stats.weekLbs} lbs this week`}</Typography>
        <Typography>{`Served ${stats.monthFamilies} families this month`}</Typography>
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
              clockWise
              fill={theme.palette.primary.main}
            />
          </RadialBarChart>
          <Typography variant="body2" mt={-2}>{`${stats.monthHours} / ${stats.monthHoursGoal} hrs`}</Typography>
        </Box>
        {quote && <Typography variant="body2">{quote}</Typography>}
      </Stack>
    </SectionCard>
  );
}
