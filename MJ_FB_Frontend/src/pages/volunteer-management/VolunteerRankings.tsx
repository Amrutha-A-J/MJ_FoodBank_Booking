import { useEffect, useState } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import Page from '../../components/Page';
import PageCard from '../../components/layout/PageCard';
import {
  getVolunteerRoles,
  getVolunteerRankings,
  getVolunteerNoShowRanking,
  type VolunteerRanking,
  type VolunteerNoShowRanking,
} from '../../api/volunteers';
import type { VolunteerRoleWithShifts } from '../../types';

export default function VolunteerRankings() {
  const [roles, setRoles] = useState<VolunteerRoleWithShifts[]>([]);
  const [option, setOption] = useState<string>('all');
  const [rankings, setRankings] = useState<(
    VolunteerRanking & Partial<VolunteerNoShowRanking>
  )[]>([]);

  useEffect(() => {
    getVolunteerRoles()
      .then(setRoles)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (option === 'noShows') {
      getVolunteerNoShowRanking()
        .then(r => setRankings(r as any))
        .catch(() => {});
    } else {
      const roleId = option === 'all' ? undefined : Number(option);
      getVolunteerRankings(roleId)
        .then(setRankings)
        .catch(() => {});
    }
  }, [option]);

  return (
    <Page title="Volunteer Rankings">
      <PageCard>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel id="ranking-select">Ranking</InputLabel>
          <Select
            labelId="ranking-select"
            label="Ranking"
            value={option}
            onChange={e => setOption(e.target.value)}
          >
            <MenuItem value="all">All Roles</MenuItem>
            {roles.map(r => (
              <MenuItem key={r.id} value={String(r.id)}>
                {`${r.name} (${r.category_name})`}
              </MenuItem>
            ))}
            <MenuItem value="noShows">No Shows</MenuItem>
          </Select>
        </FormControl>
        <List>
          {rankings.map((v, idx) => (
            <ListItem key={v.id}>
              <ListItemText
                primary={`${idx + 1}. ${v.name}`}
                secondary={
                  option === 'noShows'
                    ? `${v.noShows}/${v.totalBookings} (${Math.round(
                        (v.noShowRate || 0) * 100,
                      )}%)`
                    : `${v.total} shifts`
                }
              />
            </ListItem>
          ))}
        </List>
      </PageCard>
    </Page>
  );
}
