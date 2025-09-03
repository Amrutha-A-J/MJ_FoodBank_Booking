import Page from '../../components/Page';
import StyledTabs from '../../components/StyledTabs';
import WarehouseSettings from './settings/WarehouseSettings';
import PantrySettings from './settings/PantrySettings';
import VolunteerSettings from './settings/VolunteerSettings';

export default function AdminSettings() {
  return (
    <Page title="Settings">
      <StyledTabs
        tabs={[
          { label: 'Warehouse', content: <WarehouseSettings /> },
          { label: 'Pantry', content: <PantrySettings /> },
          { label: 'Volunteer', content: <VolunteerSettings /> },
        ]}
      />
    </Page>
  );
}
