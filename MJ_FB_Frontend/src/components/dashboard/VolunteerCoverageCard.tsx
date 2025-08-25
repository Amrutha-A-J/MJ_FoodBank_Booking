import { useEffect, useState } from 'react';
import { List, ListItem, ListItemText, Chip } from '@mui/material';
import SectionCard from './SectionCard';
import { getVolunteerRoles, getVolunteerBookingsByRole } from '../../api/volunteers';
import { formatReginaDate } from '../../utils/time';

interface CoverageItem {
  roleName: string;
  masterRole: string;
  filled: number;
  total: number;
}

interface VolunteerCoverageCardProps {
  token: string;
  masterRoleFilter?: string[];
  onCoverageLoaded?: (data: CoverageItem[]) => void;
}

export default function VolunteerCoverageCard({
  token,
  masterRoleFilter,
  onCoverageLoaded,
}: VolunteerCoverageCardProps) {
  const [coverage, setCoverage] = useState<CoverageItem[]>([]);

  useEffect(() => {
    const todayStr = formatReginaDate(new Date());

    getVolunteerRoles(token)
      .then(roles =>
        masterRoleFilter
          ? roles.filter(r => masterRoleFilter.includes(r.category_name))
          : roles,
      )
      .then(roles =>
        Promise.all(
          roles.map(async r => {
            const bookings = await getVolunteerBookingsByRole(token, r.id);
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
      .catch(() => {});
  }, [token, masterRoleFilter, onCoverageLoaded]);

  return (
    <SectionCard title="Volunteer Coverage">
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
              <ListItemText primary={`${c.roleName} (${c.masterRole})`} />
            </ListItem>
          );
        })}
      </List>
    </SectionCard>
  );
}
