import { useState } from 'react';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import AddAgency from './AddAgency';
import AgencyClientManager from './AgencyClientManager';

export default function AgencyManagement() {
  const [tab, setTab] = useState(0);
  const tabs = [
    { label: 'Add Agency', content: <AddAgency /> },
    { label: 'Add Client to Agency', content: <AgencyClientManager /> },
  ];

  return (
    <Page title="Agency Management">
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
    </Page>
  );
}
