import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { type TooltipProps, type SxProps, type Theme } from '@mui/material';

interface InfoTooltipProps {
  title?: TooltipProps['title'];
  placement?: TooltipProps['placement'];
  sx?: SxProps<Theme>;
}

export default function InfoTooltip({ sx }: InfoTooltipProps) {
  return <HelpOutlineIcon fontSize="small" color="action" sx={sx} />;
}
