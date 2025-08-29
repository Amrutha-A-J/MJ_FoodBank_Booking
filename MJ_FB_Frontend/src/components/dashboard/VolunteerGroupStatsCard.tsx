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

  return (
    <SectionCard title="Community Impact">
      <Stack spacing={2} alignItems="center">
        {HIGHLIGHT_OF_MONTH && (
          <Typography fontWeight="bold">{HIGHLIGHT_OF_MONTH}</Typography>
        )}
        <Typography>{`Volunteers distributed ${stats.weekLbs} lbs this week`}</Typography>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          data-testid="group-stats-gauge"
        >
          <RadialBarChart
            width={120}
            height={120}
            innerRadius={60}
            outerRadius={80}
            data={[{ value: progress }]}
            startAngle={90}
            endAngle={450}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              clockWise
              background
              cornerRadius={10}
              fill={theme.palette.primary.main}
            />
          </RadialBarChart>
          <Typography variant="body2" mt={1}>{`${stats.monthHours} / ${stats.monthHoursGoal} hrs`}</Typography>
        </Box>
        {quote && <Typography variant="body2" align="center">{quote}</Typography>}
      </Stack>
    </SectionCard>
  );
}
