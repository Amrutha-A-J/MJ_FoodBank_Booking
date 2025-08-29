import { useEffect, useState } from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
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
      <Stack spacing={2}>
        {HIGHLIGHT_OF_MONTH && (
          <Typography fontWeight="bold">{HIGHLIGHT_OF_MONTH}</Typography>
        )}
        <Typography>{`Volunteers distributed ${stats.weekLbs} lbs this week`}</Typography>
        <Box>
          <Typography variant="body2" mb={1}>{`Hours This Month: ${stats.monthHours} / ${stats.monthHoursGoal}`}</Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
        {quote && <Typography variant="body2">{quote}</Typography>}
      </Stack>
    </SectionCard>
  );
}
