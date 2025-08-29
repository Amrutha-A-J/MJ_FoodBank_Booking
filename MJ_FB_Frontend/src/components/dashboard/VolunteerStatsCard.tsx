import { useEffect, useState } from 'react';
import { LinearProgress, Typography } from '@mui/material';
import SectionCard from './SectionCard';
import { getVolunteerGroupStats } from '../../api/volunteers';

const quotes = [
  'Thank you for making a difference!',
  'Your time and effort feed our community.',
  'Volunteers are the heart of our mission.',
];

const highlightOfMonth = 'Highlight of the Month: Outstanding pantry team!';

interface Stats {
  week: { distributedLbs: number };
  month: { volunteerHours: number; goalHours: number };
}

export default function VolunteerStatsCard() {
  const [stats, setStats] = useState<Stats>({
    week: { distributedLbs: 0 },
    month: { volunteerHours: 0, goalHours: 0 },
  });
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    getVolunteerGroupStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setQuoteIndex(i => (i + 1) % quotes.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const progress = stats.month.goalHours
    ? Math.min((stats.month.volunteerHours / stats.month.goalHours) * 100, 100)
    : 0;

  return (
    <SectionCard title="Volunteer Impact">
      <Typography mb={1}>
        Volunteers distributed {stats.week.distributedLbs} lbs this week
      </Typography>
      <Typography variant="body2">
        {stats.month.volunteerHours} / {stats.month.goalHours} hours this month
      </Typography>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ my: 1, height: 10, borderRadius: 5 }}
      />
      {highlightOfMonth && (
        <Typography variant="body2" mb={1}>
          {highlightOfMonth}
        </Typography>
      )}
      <Typography variant="body2" fontStyle="italic">
        "{quotes[quoteIndex]}"
      </Typography>
    </SectionCard>
  );
}
