import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

export default function MaintenanceOverlay() {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        zIndex: (theme) => theme.zIndex.modal + 1,
        p: 2,
        textAlign: 'center',
      }}
    >
      <Typography variant="h5">
        {t('maintenance_message')}
      </Typography>
    </Box>
  );
}
