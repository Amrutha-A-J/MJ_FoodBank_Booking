import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import FeedbackSnackbar from '../../components/FeedbackSnackbar';
import {
  getDonor,
  getDonorDonations,
  type DonorDetail,
  type DonorDonation,
} from '../../api/donors';

export default function DonorProfile() {
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

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Donor Profile
      </Typography>
      {donor && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6">{donor.name}</Typography>
            <Typography variant="body2" color="text.secondary">
              Total: {donor.totalLbs.toLocaleString()} lbs
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Last Donation: {donor.lastDonationISO ? new Date(donor.lastDonationISO).toLocaleDateString() : 'N/A'}
            </Typography>
          </CardContent>
        </Card>
      )}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Donations
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Weight (lbs)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {donations.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{new Date(d.date).toLocaleDateString()}</TableCell>
                  <TableCell>{d.weight}</TableCell>
                </TableRow>
              ))}
              {donations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Typography variant="body2" color="text.secondary">
                      No donations found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <FeedbackSnackbar
        open={!!error}
        onClose={() => setError('')}
        message={error}
        severity="error"
      />
    </Box>
  );
}
