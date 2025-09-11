import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import StyledTabs from '../../components/StyledTabs';
import Page from '../../components/Page';
import AddVolunteer from './volunteer-management/AddVolunteer';
import EditVolunteer from './volunteer-management/EditVolunteer';
import DeleteVolunteer from './volunteer-management/DeleteVolunteer';
import BookingManagementBase from './BookingManagementBase';
import {
  getVolunteerBookingHistory,
  cancelVolunteerBooking,
  cancelRecurringVolunteerBooking,
  rescheduleVolunteerBookingByToken,
  type VolunteerBookingDetail,
  type VolunteerSearchResult,
} from '../../api/volunteers';
import VolunteerRescheduleDialog from '../../components/VolunteerRescheduleDialog';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import type { AlertColor } from '@mui/material';

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

  const [reschedule, setReschedule] = useState<{
    booking: VolunteerBookingDetail;
    reload: () => void;
  } | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertColor>('success');

  const tabs = [
    {
      label: 'Search Volunteer',
      content: (
        <BookingManagementBase<VolunteerBookingDetail, VolunteerSearchResult>
          searchType="volunteer"
          searchPlaceholder="Search volunteer"
          getId={v => v.id}
          loadHistory={getVolunteerBookingHistory}
          cancelBooking={cancelVolunteerBooking}
          cancelSeries={cancelRecurringVolunteerBooking}
          onReschedule={(b, reload) => setReschedule({ booking: b, reload })}
          showRole
          getRowKey={b => b.id}
          onMessage={(sev, msg) => {
            setSeverity(sev);
            setMessage(msg);
          }}
        />
      ),
    },
    { label: 'Add', content: <AddVolunteer /> },
    { label: 'Edit', content: <EditVolunteer /> },
    { label: 'Delete', content: <DeleteVolunteer /> },
  ];

  return (
    <Page title="Volunteer Management">
      <StyledTabs tabs={tabs} value={tab} onChange={(_, v) => setTab(v)} />
      {reschedule && (
        <VolunteerRescheduleDialog
          open={!!reschedule}
          onClose={() => setReschedule(null)}
          onSubmit={(date, roleId) => {
            rescheduleVolunteerBookingByToken(
              reschedule.booking.reschedule_token || '',
              roleId,
              date,
            )
              .then(() => {
                setSeverity('success');
                setMessage('Booking rescheduled');
                reschedule.reload();
              })
              .catch(() => {
                setSeverity('error');
                setMessage('Failed to reschedule booking');
              })
              .finally(() => setReschedule(null));
          }}
        />
      )}
      <FeedbackSnackbar
        open={!!message}
        onClose={() => setMessage('')}
        message={message}
        severity={severity}
      />
    </Page>
  );
}

