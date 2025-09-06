import { useState } from 'react';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import AddAgency from './AddAgency';
import AgencyClientManager from './AgencyClientManager';

export default function AgencyManagement() {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: 'Add Agency', content: <AddAgency /> },
    { label: 'Add Client to Agency', content: <AgencyClientManager /> },
  ];

  return (
    <Page title="Agency Management" header={<PantryQuickLinks />}>
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
    </Page>
  );
}
