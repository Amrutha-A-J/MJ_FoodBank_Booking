import { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Chip, type SxProps, type Theme } from '@mui/material';
import SectionCard from './SectionCard';
import { getVolunteerRoles, getVolunteerBookingsByRole } from '../../api/volunteers';
import { formatReginaDate } from '../../utils/time';
import FeedbackSnackbar from '../FeedbackSnackbar';

interface CoverageItem {
  roleName: string;
  masterRole: string;
  filled: number;
  total: number;
}

interface VolunteerCoverageCardProps {
  masterRoleFilter?: string[];
  onCoverageLoaded?: (data: CoverageItem[]) => void;
  sx?: SxProps<Theme>;
}

export default function VolunteerCoverageCard({
  masterRoleFilter,
  onCoverageLoaded,
  sx,
}: VolunteerCoverageCardProps) {
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const todayStr = formatReginaDate(new Date());

    getVolunteerRoles()
      .then(roles =>
        masterRoleFilter
          ? roles.filter(r => masterRoleFilter.includes(r.category_name))
          : roles,
      )
      .then(roles =>
        Promise.all(
          roles.map(async r => {
            const bookings = await getVolunteerBookingsByRole(r.id);
            const filled = bookings.filter(
              (b: any) =>
                b.status === 'approved' &&
                formatReginaDate(new Date(b.date)) === todayStr,
            ).length;
            return {
              roleName: r.name,
              masterRole: r.category_name,
              filled,
              total: r.max_volunteers,
            };
          }),
        ),
      )
      .then(data => {
        setCoverage(data);
        onCoverageLoaded?.(data);
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load volunteer coverage');
      });
  }, [masterRoleFilter, onCoverageLoaded]);

  return (
    <>
      <SectionCard title="Volunteer Coverage" sx={sx}>
        <List sx={{ maxHeight: '200px', overflowY: 'auto' }}>
          {coverage.map(c => {
            const ratio = c.filled / c.total;
            let color: 'success' | 'warning' | 'error' | 'default' = 'default';
            if (ratio >= 1) color = 'success';
            else if (ratio >= 0.5) color = 'warning';
            else color = 'error';
            return (
              <ListItem
                key={`${c.roleName}-${c.masterRole}`}
                secondaryAction={<Chip color={color} label={`${c.filled}/${c.total}`} />}
              >
                <ListItemText primary={`${c.roleName} (${c.masterRole})`} />
              </ListItem>
            );
          })}
        </List>
      </SectionCard>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
    </>
  );
}
