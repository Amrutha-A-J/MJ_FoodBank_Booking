import { useState, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';

const STORAGE_KEY = 'maintenance-banner-dismissed';

interface Props {
  notice?: string;
  children: ReactNode;
}

export default function MaintenanceBanner({ notice, children }: Props) {
  const [dismissed, setDismissed] = useState(
    typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === 'true',
  );

  if (!notice || dismissed) {
    return <>{children}</>;
  }

  const handleClose = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <>
      <Box
        sx={{
          bgcolor: 'warning.light',
          color: 'warning.contrastText',
          p: 1,
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <Typography variant="body2" sx={{ pr: 4 }}>
          {notice}
        </Typography>
        <IconButton
          size="small"
          onClick={handleClose}
          aria-label="Close"
          sx={{
            position: 'absolute',
            right: 4,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      {children}
    </>
  );
}
