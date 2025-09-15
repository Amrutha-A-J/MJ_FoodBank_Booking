import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Stack,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material';
import Page from '../../components/Page';
import DonorQuickLinks from '../../components/DonorQuickLinks';
import { getMonetaryDonors, type MonetaryDonor } from '../../api/monetaryDonors';

export default function Donors() {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [donors, setDonors] = useState<MonetaryDonor[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(handle);
  }, [term]);

  useEffect(() => {
    let active = true;
    getMonetaryDonors(debounced || undefined)
      .then(data => {
        if (active) setDonors(data);
      })
      .catch(() => {
        if (active) setDonors([]);
      });
    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <>
      <DonorQuickLinks />
      <Page title="Donors">
        <Stack spacing={2}>
          <TextField
            label="Search"
            value={term}
            onChange={e => setTerm(e.target.value)}
          />
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>First Name</TableCell>
                  <TableCell>Last Name</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {donors.map(d => (
                  <TableRow
                    key={d.id}
                    hover
                    sx={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                    onClick={() => navigate(`/donor-management/donors/${d.id}`)}
                  >
                    <TableCell>{d.firstName}</TableCell>
                    <TableCell>{d.lastName}</TableCell>
                    <TableCell>{d.email ?? ''}</TableCell>
                  </TableRow>
                ))}
                {donors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3}>No donors found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </Page>
    </>
  );
}

