import { useState } from 'react';
import { FormControl, InputLabel, Select, MenuItem, ListSubheader } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SelectChangeEvent } from '@mui/material/Select';
import type { RoleOption } from '../types';
import useVolunteerRoles from '../hooks/useVolunteerRoles';

interface Props {
  onChange: (roleId: number) => void;
}

export default function RoleSelect({ onChange }: Props) {
  const [selected, setSelected] = useState('');
  const { t } = useTranslation();
  const { roles, isLoading, error } = useVolunteerRoles();

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

  if (isLoading) return <p>{t('loading')}</p>;
  if (error) return <p>{(error as Error).message}</p>;

  return (
    <FormControl fullWidth>
      <InputLabel id="role-select-label">{t('role')}</InputLabel>
      <Select
        labelId="role-select-label"
        value={selected}
        label={t('role')}
        onChange={handleChange}
      >
        <MenuItem value="">{t('role')}</MenuItem>
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

