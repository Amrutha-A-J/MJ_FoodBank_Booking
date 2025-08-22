import { useEffect, useState } from 'react';
import RoleSelect from '../components/RoleSelect';
import ScheduleTable from '../components/ScheduleTable';
import type { Shift } from '../types';
import { getRoleShifts } from '../api/volunteers';

export default function CoordinatorSchedule() {
  const [roleId, setRoleId] = useState<number | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roleId === null) return;
    const fetchShifts = async () => {
      setLoading(true);
      try {
        const data = await getRoleShifts(roleId);
        setShifts(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching shifts');
        setShifts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchShifts();
  }, [roleId]);

  return (
    <div>
      <RoleSelect onChange={setRoleId} />
      {loading && <p>Loading shifts...</p>}
      {error && <p>{error}</p>}
      {!loading && !error && roleId !== null && (
        <ScheduleTable shifts={shifts} />
      )}
    </div>
  );
}

