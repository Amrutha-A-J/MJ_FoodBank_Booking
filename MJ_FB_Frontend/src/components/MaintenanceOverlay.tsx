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
        flexDirection: 'column',
      }}
    >
      <Box
        component="img"
        src="/images/mjfoodbank_logo.png"
        alt="Food Bank logo"
        sx={{ mb: 2, width: { xs: 160, sm: 200 } }}
      />
      <Typography variant="h5">
        We are under maintenance. Please check back later.
      </Typography>
    </Box>
  );
}
