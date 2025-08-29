import { useEffect, useState } from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import SectionCard from './SectionCard';
import { getGroupVolunteerStats, type GroupVolunteerStats } from '../../api/volunteers';

const quotes = [
  'We appreciate your dedication!',
  'Thank you for making a difference!',
  'Your time helps feed our community!'
];

const highlightOfMonth = 'Community Garden kickoff exceeded expectations';

export default function VolunteerStatsCard() {
  const [stats, setStats] = useState<GroupVolunteerStats | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    getGroupVolunteerStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIndex(i => (i + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  if (!stats) return null;

  const progress = stats.currentMonth.goalHours
    ? Math.min((stats.currentMonth.hours / stats.currentMonth.goalHours) * 100, 100)
    : 0;

  return (
    <SectionCard title="Volunteer Highlights">
      <Typography>{`Volunteers distributed ${stats.currentWeekLbs} lbs this week`}</Typography>
      <Box sx={{ my: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {`Monthly Hours: ${stats.currentMonth.hours}/${stats.currentMonth.goalHours}`}
        </Typography>
        <LinearProgress variant="determinate" value={progress} />
      </Box>
      {highlightOfMonth && (
        <Typography sx={{ mb: 1 }}>{highlightOfMonth}</Typography>
      )}
      <Typography sx={{ fontStyle: 'italic' }}>{quotes[quoteIndex]}</Typography>
    </SectionCard>
  );
}
