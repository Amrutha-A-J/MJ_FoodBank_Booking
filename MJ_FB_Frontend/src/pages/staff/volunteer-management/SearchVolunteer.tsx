import { useState } from 'react';
import EntitySearch from '../../../components/EntitySearch';
import ResponsiveTable, { type Column } from '../../../components/ResponsiveTable';
import type { VolunteerSearchResult } from '../../../api/volunteers';

export default function SearchVolunteer() {
  const [selected, setSelected] = useState<VolunteerSearchResult | null>(null);
  const columns: Column<VolunteerSearchResult>[] = [
    { field: 'name', header: 'Name' },
    { field: 'clientId', header: 'Client ID' },
  ];
  return (
    <div>
      <EntitySearch
        type="volunteer"
        placeholder="Search volunteer"
        onSelect={v => setSelected(v as VolunteerSearchResult)}
      />
      {selected && <ResponsiveTable columns={columns} rows={[selected]} />}
    </div>
  );
}
