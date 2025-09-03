import Page from '../../components/Page';
import StyledTabs from '../../components/StyledTabs';
import WarehouseSettings from './settings/WarehouseSettings';
import PantrySettingsTab from './settings/PantrySettingsTab';
import VolunteerSettingsTab from './settings/VolunteerSettingsTab';

export default function AdminSettings() {
  return (
    <Page title="Settings">
      <StyledTabs
        tabs={[
          { label: 'Warehouse', content: <WarehouseSettings /> },
          { label: 'Pantry', content: <PantrySettingsTab /> },
          { label: 'Volunteer', content: <VolunteerSettingsTab /> },
        ]}
      />
    </Page>
  );
}
