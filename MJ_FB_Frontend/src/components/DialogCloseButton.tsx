import { IconButton } from '@mui/material';
import Close from '@mui/icons-material/Close';

export default function DialogCloseButton({ onClose }: { onClose: () => void }) {
  return (
    <IconButton
      aria-label="close"
      onClick={onClose}
      sx={{ position: 'absolute', top: 8, right: 8 }}
    >
      <Close />
    </IconButton>
  );
}
