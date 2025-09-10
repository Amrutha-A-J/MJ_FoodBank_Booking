import { useEffect, useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Chip,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  type SxProps,
  type Theme,
} from '@mui/material';
import SectionCard from './SectionCard';
import { getVolunteerRoles, getVolunteerBookingsByRole } from '../../api/volunteers';
import { formatReginaDate, formatTime } from '../../utils/time';
import { toDate } from '../../utils/date';
import FeedbackSnackbar from '../FeedbackSnackbar';
import DialogCloseButton from '../DialogCloseButton';

interface CoverageItem {
  roleName: string;
  masterRole: string;
  filled: number;
  total: number;
  volunteers: string[];
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
  const [selected, setSelected] = useState<CoverageItem | null>(null);

  useEffect(() => {
    const todayStr = formatReginaDate(toDate());

    getVolunteerRoles()
      .then(roles =>
        masterRoleFilter
          ? roles.filter(r => masterRoleFilter.includes(r.category_name))
          : roles,
      )
      .then(async roles => {
        const data = await Promise.all(
          roles.flatMap(r =>
            (r.shifts ?? []).map(async s => {
              const bookings = await getVolunteerBookingsByRole(s.id);
              const todayBookings = bookings.filter(
                (b: any) =>
                  b.status === 'approved' &&
                  formatReginaDate(toDate(b.date)) === todayStr,
              );
              const volunteers = todayBookings
                .map((b: any) => b.volunteer_name)
                .filter(Boolean);
              return {
                roleName: `${r.name} ${formatTime(s.start_time)}–${formatTime(
                  s.end_time,
                )}`,
                masterRole: r.category_name,
                filled: todayBookings.length,
                total: r.max_volunteers,
                volunteers,
              };
            }),
          ),
        );
        return data;
      })
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
                disablePadding
              >
                <ListItemButton onClick={() => setSelected(c)}>
                  <ListItemText primary={`${c.roleName} (${c.masterRole})`} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </SectionCard>
      <Dialog open={!!selected} onClose={() => setSelected(null)}>
        <DialogTitle sx={{ position: 'relative' }}>
          {`Volunteers – ${selected?.roleName ?? ''}`}
          <DialogCloseButton onClose={() => setSelected(null)} />
        </DialogTitle>
        <DialogContent>
          {selected?.volunteers.length ? (
            <List sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {selected.volunteers.map(name => (
                <ListItem key={name}>
                  <ListItemText primary={name} />
                </ListItem>
              ))}
            </List>
          ) : (
            'No volunteer is available'
          )}
        </DialogContent>
      </Dialog>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
    </>
  );
}
