import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  getVolunteerRoles,
  getVolunteerRankings,
  type VolunteerRanking,
} from '../../../api/volunteers';
import type { VolunteerRoleWithShifts } from '../../../types';

interface Department {
  id: number;
  name: string;
  roleIds: number[];
}

export default function VolunteerRanking() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [overall, setOverall] = useState<VolunteerRanking[]>([]);
  const [deptRanks, setDeptRanks] = useState<Record<number, VolunteerRanking[]>>({});

  useEffect(() => {
    getVolunteerRoles()
      .then(roles => {
        const map = new Map<number, Department>();
        roles.forEach((r: VolunteerRoleWithShifts) => {
          const existing = map.get(r.category_id);
          if (existing) existing.roleIds.push(r.id);
          else map.set(r.category_id, {
            id: r.category_id,
            name: r.category_name,
            roleIds: [r.id],
          });
        });
        const groups = Array.from(map.values());
        setDepartments(groups);
        groups.forEach(g => {
          Promise.all(
            g.roleIds.map(id =>
              getVolunteerRankings(id).catch(() => []),
            ),
          )
            .then(res => {
              const totals: Record<number, VolunteerRanking> = {};
              res.flat().forEach(v => {
                if (totals[v.id]) totals[v.id].total += v.total;
                else totals[v.id] = { ...v };
              });
              const top = Object.values(totals)
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);
              setDeptRanks(prev => ({ ...prev, [g.id]: top }));
            })
            .catch(() => {});
        });
      })
      .catch(() => {});
    getVolunteerRankings()
      .then(r => setOverall(r.slice(0, 5)))
      .catch(() => {});
  }, []);

  return (
    <>
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          All Departments
        </AccordionSummary>
        <AccordionDetails>
          <List>
            {overall.map((v, idx) => (
              <ListItem key={v.id}>
                <ListItemText
                  primary={`${idx + 1}. ${v.name}`}
                  secondary={`${v.total} shifts`}
                />
              </ListItem>
            ))}
          </List>
        </AccordionDetails>
      </Accordion>
      {departments.map(d => (
        <Accordion key={d.id}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {d.name}
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {(deptRanks[d.id] || []).map((v, idx) => (
                <ListItem key={v.id}>
                  <ListItemText
                    primary={`${idx + 1}. ${v.name}`}
                    secondary={`${v.total} shifts`}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      ))}
    </>
  );
}

