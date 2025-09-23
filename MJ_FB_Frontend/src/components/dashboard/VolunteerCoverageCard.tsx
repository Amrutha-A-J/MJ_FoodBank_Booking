import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Chip,
  ListItemButton,
  DialogTitle,
  DialogContent,
  ListSubheader,
  type SxProps,
  type Theme,
} from '@mui/material';
import SectionCard from './SectionCard';
import { getVolunteerRoles, getVolunteerBookingsByRole } from '../../api/volunteers';
import { formatReginaDate, formatTime } from '../../utils/time';
import { toDate, toDayjs } from '../../utils/date';
import FeedbackSnackbar from '../FeedbackSnackbar';
import DialogCloseButton from '../DialogCloseButton';
import FormDialog from '../FormDialog';

interface CoverageItem {
  roleName: string;
  masterRole: string;
  filled: number;
  total: number;
  volunteers: string[];
  startTime: string;
  period: 'morning' | 'afternoon';
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
  const showMorningFirst = useMemo(() => toDayjs(new Date()).hour() < 11, []);

  const groupedCoverage = useMemo(() => {
    const morning = coverage.filter(item => item.period === 'morning');
    const afternoon = coverage.filter(item => item.period === 'afternoon');
    const groups = showMorningFirst
      ? [
          { label: 'Morning', items: morning },
          { label: 'Afternoon', items: afternoon },
        ]
      : [
          { label: 'Afternoon', items: afternoon },
          { label: 'Morning', items: morning },
        ];
    return groups.filter(group => group.items.length > 0);
  }, [coverage, showMorningFirst]);

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
                  (b.status === 'approved' || b.status === 'completed') &&
                  formatReginaDate(toDate(b.date)) === todayStr,
              );
              const volunteers = todayBookings
                .map((b: any) => b.volunteer_name)
                .filter(Boolean) as string[];
              const startTime = s.start_time;
              const hour = Number.parseInt(startTime?.split(':')[0] ?? '', 10);
              const period: CoverageItem['period'] =
                Number.isFinite(hour) && hour < 12 ? 'morning' : 'afternoon';
              return {
                roleName: `${r.name} ${formatTime(s.start_time)}–${formatTime(
                  s.end_time,
                )}`,
                masterRole: r.category_name,
                filled: todayBookings.length,
                total: r.max_volunteers,
                volunteers,
                startTime,
                period,
              } satisfies CoverageItem;
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
          {groupedCoverage.map(group => (
            <Fragment key={group.label}>
              <ListSubheader
                disableSticky
                data-testid={`coverage-group-${group.label.toLowerCase()}`}
              >
                {group.label}
              </ListSubheader>
              {group.items.map(c => {
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
            </Fragment>
          ))}
        </List>
      </SectionCard>
      <FormDialog open={!!selected} onClose={() => setSelected(null)}>
        <DialogTitle sx={{ position: 'relative' }}>
          {`Volunteers – ${selected?.roleName ?? ''}`}
          <DialogCloseButton onClose={() => setSelected(null)} />
        </DialogTitle>
        <DialogContent>
          {selected?.volunteers.length ? (
            <List sx={{ maxHeight: 300, overflowY: 'auto' }}>
              {selected.volunteers.map((name, index) => (
                <ListItem key={`${name}-${index}`}>
                  <ListItemText primary={name} />
                </ListItem>
              ))}
            </List>
          ) : (
            'No volunteer is available'
          )}
        </DialogContent>
      </FormDialog>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
    </>
  );
}
