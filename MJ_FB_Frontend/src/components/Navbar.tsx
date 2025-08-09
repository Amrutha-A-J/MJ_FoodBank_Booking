import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';

export type NavLink = { label: string; id: string };
export type NavGroup = { label: string; links: NavLink[] };

interface NavbarProps {
  groups: NavGroup[];
  active: string;
  onSelect: (id: string) => void;
  onLogout: () => void;
  name?: string;
  loading?: boolean;
}

export default function Navbar({ groups, active, onSelect, onLogout, name, loading }: NavbarProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileAnchorEl, setMobileAnchorEl] = useState<null | HTMLElement>(null);

  function handleGroupClick(label: string, event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
    setOpenGroup(label);
  }

  function closeGroup() {
    setAnchorEl(null);
    setOpenGroup(null);
  }

  const mobileMenuOpen = Boolean(mobileAnchorEl);

  return (
    <AppBar position="static">
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Food Bank Portal
        </Typography>
        {isSmall ? (
          <>
            <IconButton color="inherit" onClick={(e) => setMobileAnchorEl(e.currentTarget)}>
              <MenuIcon />
            </IconButton>
            <Menu
              anchorEl={mobileAnchorEl}
              open={mobileMenuOpen}
              onClose={() => setMobileAnchorEl(null)}
            >
              {groups.map((group) => (
                <Box key={group.label}>
                  {!(group.links.length === 1 && group.links[0].label === group.label) && (
                    <MenuItem disabled>{group.label}</MenuItem>
                  )}
                  {group.links.map(({ label, id }) => (
                    <MenuItem
                      key={id}
                      selected={active === id}
                      onClick={() => {
                        setMobileAnchorEl(null);
                        onSelect(id);
                      }}
                      disabled={loading}
                    >
                      {label}
                    </MenuItem>
                  ))}
                </Box>
              ))}
            </Menu>
          </>
        ) : (
          groups.map((group) =>
            group.links.length === 1 ? (
              <Button
                key={group.links[0].id}
                variant="outlined"
                color="primary"
                onClick={() => onSelect(group.links[0].id)}
                disabled={loading}
              >
                {group.links[0].label}
              </Button>
            ) : (
              <Box key={group.label}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={(e) => handleGroupClick(group.label, e)}
                >
                  {group.label}
                </Button>
                <Menu anchorEl={anchorEl} open={openGroup === group.label} onClose={closeGroup}>
                  {group.links.map(({ label, id }) => (
                    <MenuItem
                      key={id}
                      selected={active === id}
                      onClick={() => {
                        closeGroup();
                        onSelect(id);
                      }}
                      disabled={loading}
                    >
                      {label}
                    </MenuItem>
                  ))}
                </Menu>
              </Box>
            )
          )
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" sx={{ mr: 1 }}>
          Hello, {name}
        </Typography>
        <Button color="inherit" onClick={onLogout} sx={{ ml: 1 }}>
          Logout
        </Button>
      </Toolbar>
    </AppBar>
  );
}
