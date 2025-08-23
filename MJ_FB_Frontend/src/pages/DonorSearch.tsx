import { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardHeader,
  CardContent,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { getDonors, getDonorDetails, Donor, DonorDetails } from '../api/donors';

export default function DonorSearch() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Donor[]>([]);
  const [selected, setSelected] = useState<DonorDetails | null>(null);

  useEffect(() => {
    let active = true;
    getDonors(search).then((d) => {
      if (active) setResults(d);
    });
    return () => {
      active = false;
    };
  }, [search]);

  const handleSelect = async (id: number) => {
    const details = await getDonorDetails(id);
    setSelected(details);
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
          <CardHeader title="Donor Search" />
          <CardContent>
            <TextField
              label="Search donors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            />
            <List dense>
              {results.map((donor) => (
                <ListItemButton key={donor.id} onClick={() => handleSelect(donor.id)}>
                  <ListItemText primary={donor.name} />
                </ListItemButton>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      {selected && (
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ borderRadius: 1, boxShadow: 1 }}>
            <CardHeader title={selected.name} />
            <CardContent>
              <Typography variant="body2" gutterBottom>
                Total donations: {selected.totalDonations} lbs
              </Typography>
              <Typography variant="body2" gutterBottom>
                Total this year: {selected.totalDonationsThisYear} lbs
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Weight (lbs)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selected.donations.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.date}</TableCell>
                      <TableCell align="right">{d.weight}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
}
