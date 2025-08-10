import { useEffect, useState } from 'react';
import type { RoleOption } from '../types';

interface Props {
  onChange: (roleId: number) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE || '';

export default function RoleSelect({ onChange }: Props) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/roles`);
        if (!res.ok) throw new Error('Failed to load roles');
        const data: RoleOption[] = await res.json();
        setRoles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching roles');
      } finally {
        setLoading(false);
      }
    };
    fetchRoles();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
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
    <select value={selected} onChange={handleChange}>
      <option value="">Select a role</option>
      {Object.entries(grouped).map(([category, items]) => (
        <optgroup key={category} label={category}>
          {items.map((r) => (
            <option key={r.roleId} value={r.roleId}>
              {r.roleName}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

