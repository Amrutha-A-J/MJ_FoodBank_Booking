import { useState, useEffect } from 'react';
import { TextField, Stack, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import Page from '../../components/Page';
import DonorQuickLinks from '../../components/DonorQuickLinks';
import { getMonetaryDonors, type MonetaryDonor } from '../../api/monetaryDonors';

export default function Donors() {
  const [term, setTerm] = useState('');
  const [donors, setDonors] = useState<MonetaryDonor[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => {
      getMonetaryDonors(term)
        .then(setDonors)
        .catch(() => setDonors([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [term]);

  return (
    <>
      <DonorQuickLinks />
      <Page title="Donors">
        <Stack spacing={2}>
          <TextField label="Search" value={term} onChange={e => setTerm(e.target.value)} />
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {donors.map(d => (
                  <TableRow
                    key={d.id}
                    component={RouterLink}
                    to={`/donor-management/donors/${d.id}`}
                    hover
                    sx={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <TableCell>{d.firstName} {d.lastName}</TableCell>
                    <TableCell>{d.email}</TableCell>
                  </TableRow>
                ))}
                {donors.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2}>No donors found.</TableCell>
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

