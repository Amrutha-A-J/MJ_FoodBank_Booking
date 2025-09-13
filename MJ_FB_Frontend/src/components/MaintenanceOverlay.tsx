import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

export default function MaintenanceOverlay() {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        bgcolor: 'background.paper',
        zIndex: (theme) => theme.zIndex.modal + 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        p: 2,
      }}
    >
      <Typography variant="h5">
        We are under maintenance. Please check back later.
      </Typography>
    </Box>
  );
}
