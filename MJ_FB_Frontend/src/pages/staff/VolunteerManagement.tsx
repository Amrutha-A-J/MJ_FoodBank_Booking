import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import VolunteerQuickLinks from '../../components/VolunteerQuickLinks';
import AddVolunteer from './volunteer-management/AddVolunteer';
import EditVolunteer from './volunteer-management/EditVolunteer';
import DeleteVolunteer from './volunteer-management/DeleteVolunteer';
import VolunteerRanking from './volunteer-management/VolunteerRanking';

export default function VolunteerManagement() {
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab');
  const [tab, setTab] = useState(() => {
    switch (initial) {
      case 'add':
        return 1;
      case 'delete':
        return 2;
      case 'ranking':
        return 3;
      default:
        return 0;
    }
  });

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'add') setTab(1);
    else if (t === 'delete') setTab(2);
    else if (t === 'ranking') setTab(3);
    else setTab(0);
  }, [searchParams]);

  const tabs = useMemo(
    () => [
      { label: 'Search Volunteer', content: <EditVolunteer /> },
      { label: 'Add', content: <AddVolunteer /> },
      { label: 'Delete', content: <DeleteVolunteer /> },
      { label: 'Ranking', content: <VolunteerRanking /> },
    ],
    [],
  );

  return (
    <Page title="Volunteer Management" header={<VolunteerQuickLinks />}>
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
    </Page>
  );
}

