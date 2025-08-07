import { AppBar, Toolbar, Typography, Button, Box, IconButton } from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { useContext } from 'react';
import { ColorModeContext } from '../theme';

type NavLink = { label: string; id: string };

interface NavbarProps {
  links: NavLink[];
  active: string;
  onSelect: (id: string) => void;
  onLogout: () => void;
  name?: string;
  loading?: boolean;
}

export default function Navbar({ links, active, onSelect, onLogout, name, loading }: NavbarProps) {
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Food Bank Portal
        </Typography>
        {links.map(({ label, id }) => (
          <Button
            key={id}
            color={active === id ? 'secondary' : 'inherit'}
            onClick={() => onSelect(id)}
            disabled={loading}
          >
            {label}
          </Button>
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{ mr: 1 }}>
          Hello, {name}
        </Typography>
        <IconButton color="inherit" onClick={colorMode.toggleColorMode}>
          {theme.palette.mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
        </IconButton>
        <Button color="inherit" onClick={onLogout} sx={{ ml: 1 }}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}
