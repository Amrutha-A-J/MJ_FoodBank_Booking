import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { Tooltip, type TooltipProps, type SxProps, type Theme } from '@mui/material';

interface InfoTooltipProps {
  title?: TooltipProps['title'];
  placement?: TooltipProps['placement'];
  sx?: SxProps<Theme>;
}

export default function InfoTooltip({ title, placement = 'top', sx }: InfoTooltipProps) {
  return (
    <Tooltip title={title ?? ''} placement={placement}>
      <HelpOutlineIcon fontSize="small" color="action" sx={sx} />
    </Tooltip>
  );
}
