import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  getDonor,
  getDonorDonations,
  type DonorDetail,
  type DonorDonation,
} from '../../api/donors';
import { formatLocaleDate } from '../../utils/date';
import Page from '../../components/Page';
import ResponsiveTable, { type Column } from '../../components/ResponsiveTable';

export default function DonorProfile() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [donor, setDonor] = useState<DonorDetail | null>(null);
  const [donations, setDonations] = useState<DonorDonation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const donorId = Number(id);
    getDonor(donorId)
      .then(setDonor)
      .catch(err => setError(err.message || 'Failed to load donor'));
    getDonorDonations(donorId)
      .then(setDonations)
      .catch(err => setError(err.message || 'Failed to load donations'));
  }, [id]);

  const columns: Column<DonorDonation>[] = [
    {
      field: 'date',
      header: 'Date',
      render: d => formatLocaleDate(d.date),
    },
    { field: 'weight', header: 'Weight (lbs)' },
  ];

  return (
    <Page title="Donor Profile">
      <Box>
      {donor && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{donor.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Total: {donor.totalLbs.toLocaleString()} lbs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last Donation: {donor.lastDonationISO ? formatLocaleDate(donor.lastDonationISO) : t('not_applicable')}
            </Typography>
          </CardContent>
        </Card>
      )}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Donations
          </Typography>
          {donations.length ? (
            <ResponsiveTable columns={columns} rows={donations} getRowKey={d => d.id} />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No donations found.
            </Typography>
          )}
        </CardContent>
      </Card>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
      </Box>
    </Page>
  );
}
