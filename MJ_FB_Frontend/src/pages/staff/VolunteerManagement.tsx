import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import PantryQuickLinks from '../../components/PantryQuickLinks';
import SearchVolunteer from './volunteer-management/SearchVolunteer';
import AddVolunteer from './volunteer-management/AddVolunteer';
import EditVolunteer from './volunteer-management/EditVolunteer';
import DeleteVolunteer from './volunteer-management/DeleteVolunteer';

export default function VolunteerManagement() {
  const [searchParams] = useSearchParams();
  const initial = searchParams.get('tab');
  const [tab, setTab] = useState(() => {
    switch (initial) {
      case 'add':
        return 1;
      case 'edit':
        return 2;
      case 'delete':
        return 3;
      default:
        return 0;
    }
  });

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'add') setTab(1);
    else if (t === 'edit') setTab(2);
    else if (t === 'delete') setTab(3);
    else setTab(0);
  }, [searchParams]);

  const tabs = [
    { label: 'Search Volunteer', content: <SearchVolunteer /> },
    { label: 'Add', content: <AddVolunteer /> },
    { label: 'Edit', content: <EditVolunteer /> },
    { label: 'Delete', content: <DeleteVolunteer /> },
  ];

  return (
    <Page title="Volunteer Management" header={<PantryQuickLinks />}>
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
    </Page>
  );
}

