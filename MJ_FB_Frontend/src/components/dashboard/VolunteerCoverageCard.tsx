import { useEffect, useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { getVolunteerRoles, getVolunteerBookingsByRole } from '../../api/volunteers';

interface VolunteerCoverageCardProps {
  token: string;
  masterRoleFilter?: string[];
  onVolunteerCount?: (count: number) => void;
}

interface Coverage {
  role: string;
  filled: number;
  total: number;
}

function formatLocalDate(date: Date) {
  return date.toLocaleDateString('en-CA');
}

export default function VolunteerCoverageCard({
  token,
  masterRoleFilter,
  onVolunteerCount,
}: VolunteerCoverageCardProps) {
  const [coverage, setCoverage] = useState<Coverage[]>([]);

  useEffect(() => {
    const todayStr = formatLocalDate(new Date());
    getVolunteerRoles(token)
      .then(roles => {
        let filtered = roles;
        if (masterRoleFilter && masterRoleFilter.length > 0) {
          filtered = roles.filter((r: any) =>
            masterRoleFilter.includes(r.category_name),
          );
        }
        return Promise.all(
          filtered.map(async r => {
            const bookings = await getVolunteerBookingsByRole(token, r.id);
            const filled = bookings.filter(
              (b: any) =>
                b.status === 'approved' &&
                formatLocalDate(new Date(b.date)) === todayStr,
            ).length;
            return { role: r.name, filled, total: r.max_volunteers };
          }),
        );
      })
      .then(cov => {
        setCoverage(cov);
        onVolunteerCount?.(cov.reduce((sum, c) => sum + c.filled, 0));
      })
      .catch(() => {});
  }, [token, masterRoleFilter, onVolunteerCount]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
      <CardHeader title="Volunteer Coverage" />
      <CardContent>
        <List>
          {coverage.map((c, i) => {
            const ratio = c.filled / c.total;
            let color: 'success' | 'warning' | 'error' | 'default' = 'default';
            if (ratio >= 1) color = 'success';
            else if (ratio >= 0.5) color = 'warning';
            else color = 'error';
            return (
              <ListItem
                key={i}
                secondaryAction={<Chip color={color} label={`${c.filled}/${c.total}`} />}
              >
                <ListItemText primary={c.role} />
              </ListItem>
            );
          })}
        </List>
      </CardContent>
    </Card>
  );
}

