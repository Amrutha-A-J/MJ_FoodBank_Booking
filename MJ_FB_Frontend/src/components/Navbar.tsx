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
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export type NavLink = { label: string; to: string };
export type NavGroup = { label: string; links: NavLink[] };

interface NavbarProps {
  groups: NavGroup[];
  onLogout: () => void;
  name?: string;
  loading?: boolean;
}

export default function Navbar({ groups, onLogout, name, loading }: NavbarProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileAnchorEl, setMobileAnchorEl] = useState<null | HTMLElement>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const location = useLocation();

  function handleGroupClick(label: string, event: React.MouseEvent<HTMLElement>) {
    setAnchorEl(event.currentTarget);
    setOpenGroup(label);
  }

  function closeGroup() {
    setAnchorEl(null);
    setOpenGroup(null);
  }

  function handleProfileClick(event: React.MouseEvent<HTMLElement>) {
    setProfileAnchorEl(event.currentTarget);
  }

  function closeProfileMenu() {
    setProfileAnchorEl(null);
  }

  const mobileMenuOpen = Boolean(mobileAnchorEl);
  const profileMenuOpen = Boolean(profileAnchorEl);

  return (
    <Box
      sx={{
        height: { xs: 150, sm: 200 },
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      <AppBar
        position="static"
        sx={{ bgcolor: 'common.black', color: 'common.white' }}
      >
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', minHeight: { xs: 48, sm: 56 } }}>
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
                  {group.links.map(({ label, to }) => (
                    <MenuItem
                      key={to}
                      component={RouterLink}
                      to={to}
                      selected={location.pathname === to}
                      onClick={() => {
                        setMobileAnchorEl(null);
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
                key={group.links[0].to}
                color="inherit"
                component={RouterLink}
                to={group.links[0].to}
                disabled={loading}
              >
                {group.links[0].label}
              </Button>
            ) : (
              <Box key={group.label}>
                <Button
                  color="inherit"
                  onClick={(e) => handleGroupClick(group.label, e)}
                  endIcon={openGroup === group.label ? <ExpandLess /> : <ExpandMore />}
                >
                  {group.label}
                </Button>
                <Menu anchorEl={anchorEl} open={openGroup === group.label} onClose={closeGroup}>
                  {group.links.map(({ label, to }) => (
                    <MenuItem
                      key={to}
                      component={RouterLink}
                      to={to}
                      selected={location.pathname === to}
                      onClick={closeGroup}
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
        {name ? (
          <>
            <Button
              color="inherit"
              onClick={handleProfileClick}
              endIcon={profileMenuOpen ? <ExpandLess /> : <ExpandMore />}
            >
              Hello, {name}
            </Button>
            <Menu
              anchorEl={profileAnchorEl}
              open={profileMenuOpen}
              onClose={closeProfileMenu}
            >
              <MenuItem
                component={RouterLink}
                to="/profile"
                onClick={closeProfileMenu}
                disabled={loading}
              >
                Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  closeProfileMenu();
                  onLogout();
                }}
                disabled={loading}
              >
                Logout
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Button color="inherit" onClick={onLogout} disabled={loading}>
            Logout
          </Button>
        )}
      </Toolbar>
    </AppBar>
  </Box>
  );
}
