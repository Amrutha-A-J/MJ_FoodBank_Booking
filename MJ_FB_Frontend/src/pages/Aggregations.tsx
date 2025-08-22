import { useState } from 'react';
import { Tabs, Tab } from '@mui/material';
import Page from '../components/Page';

export default function Aggregations() {
  const [tab, setTab] = useState(0);

  return (
    <Page title="Aggregations">
      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Donor Aggregations" />
        <Tab label="Retail Program" />
        <Tab label="Overall" />
      </Tabs>
      {tab === 0 && null}
      {tab === 1 && null}
      {tab === 2 && null}
    </Page>
  );
}
