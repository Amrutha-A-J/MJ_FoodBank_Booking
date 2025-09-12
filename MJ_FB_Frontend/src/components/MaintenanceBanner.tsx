import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
  notice?: string;
}

const STORAGE_KEY = 'maintenanceBannerDismissed';

export default function MaintenanceBanner({ notice }: Props) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  if (!notice || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <Box
      sx={{
        bgcolor: 'warning.light',
        color: 'text.primary',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        p: 1,
      }}
    >
      <Typography variant="body2" sx={{ textAlign: 'center' }}>
        {notice}
      </Typography>
      <IconButton
        aria-label="dismiss"
        size="small"
        onClick={handleDismiss}
        sx={{ position: 'absolute', right: 4, top: 4 }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
