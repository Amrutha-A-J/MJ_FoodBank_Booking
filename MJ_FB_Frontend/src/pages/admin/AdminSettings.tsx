import Page from '../../components/Page';
import StyledTabs from '../../components/StyledTabs';
import WarehouseSettings from './WarehouseSettings';
import PantrySettings from './PantrySettings';
import VolunteerSettings from './VolunteerSettings';

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
