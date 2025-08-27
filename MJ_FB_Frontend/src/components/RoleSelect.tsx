import { useEffect, useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, ListSubheader } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { RoleOption } from '../types';
import { getRoles } from '../api/volunteers';

interface Props {
  onChange: (roleId: number) => void;
}

export default function RoleSelect({ onChange }: Props) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const data = await getRoles();
        setRoles(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching roles');
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const handleChange = (e: SelectChangeEvent) => {
    const value = e.target.value;
    setSelected(value);
    const id = Number(value);
    if (!Number.isNaN(id)) {
      onChange(id);
    }
  };

  const grouped: Record<string, RoleOption[]> = roles.reduce((acc, role) => {
    acc[role.categoryName] = acc[role.categoryName] || [];
    acc[role.categoryName].push(role);
    return acc;
  }, {} as Record<string, RoleOption[]>);

  if (loading) return <p>Loading roles...</p>;
  if (error) return <p>{error}</p>;

  return (
    <FormControl size="small" fullWidth>
      <InputLabel id="role-select-label">Role</InputLabel>
      <Select
        labelId="role-select-label"
        value={selected}
        label="Role"
        onChange={handleChange}
      >
        <MenuItem value="">Select a role</MenuItem>
        {Object.entries(grouped).flatMap(([category, items]) => [
          <ListSubheader key={`${category}-header`}>{category}</ListSubheader>,
          ...items.map((r) => (
            <MenuItem key={r.roleId} value={r.roleId}>
              {r.roleName}
            </MenuItem>
          )),
        ])}
      </Select>
    </FormControl>
  );
}

