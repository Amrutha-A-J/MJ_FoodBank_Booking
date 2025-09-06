import {
  AppBar,
  Toolbar,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Badge,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ChevronLeft from '@mui/icons-material/ChevronLeft';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export type NavLink = { label: string; to: string; badge?: number };
export type NavGroup = { label: string; links: NavLink[] };

interface NavbarProps {
  groups: NavGroup[];
  onLogout?: () => void;
  name?: string;
  loading?: boolean;
  profileLinks?: NavLink[];
  role?: string;
}

export default function Navbar({
  groups,
  onLogout,
  name,
  loading,
  profileLinks,
  role,
}: NavbarProps) {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSubmenu, setMobileSubmenu] = useState<NavGroup | null>(null);
  const [profileAnchorEl, setProfileAnchorEl] = useState<null | HTMLElement>(null);
  const location = useLocation();
  const { t } = useTranslation();

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

  const profileMenuOpen = Boolean(profileAnchorEl);

  // ====== STYLE TOKENS to match mjfoodbank.org ======
  const NAV_TXT_SX = {
    textTransform: 'uppercase',
    fontWeight: 800,
    letterSpacing: '0.06em',
    color: 'common.white',
    fontSize: { xs: 12, sm: 13, md: 14 },
    px: 1.5,
    py: 1,
    borderRadius: 1,
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.06)',
    },
  } as const;

  const DROPDOWN_ITEM_SX = {
    textTransform: 'uppercase',
    fontWeight: 800,
    letterSpacing: '0.06em',
    color: 'common.black',
    fontSize: 13,
    borderRadius: 1,
    py: 1.2,
    px: 1.75,
    '&:hover': { backgroundColor: 'rgba(0,0,0,0.06)' },
    '&.Mui-selected, &.Mui-selected:hover': {
      backgroundColor: 'rgba(0,0,0,0.06)',
    },
  } as const;

  const menuPaperProps = {
    elevation: 0,
    sx: {
      bgcolor: 'common.white',
      borderRadius: 2,
      border: `1px solid ${theme.palette.divider}`,
      boxShadow: '0 10px 24px rgba(0,0,0,.12)',
      overflow: 'hidden',
      mt: 1,
      minWidth: 220,
    },
  };

  return (
    <Box
      sx={{
        height: { xs: 150, sm: 130 },
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        position: 'relative',
      }}
    >
      {/* Logo sitting on the black ribbon */}
      <Box sx={{ position: 'relative', height: 0 }}>
          <Box
          component="img"
          src="/images/mjfoodbank_logo.png"
          alt="Food Bank logo"
          sx={{ position: 'absolute', top: -26, left: 15, width: 178 }}
        />
      </Box>

      {/* Black nav bar */}
      <AppBar position="static" sx={{ bgcolor: 'common.black', color: 'common.white', boxShadow: 'none' }}>
        <Toolbar sx={{ gap: 2, flexWrap: 'wrap', minHeight: { xs: 48, sm: 56 }, justifyContent: 'flex-end' }}>
          {isSmall ? (
            <>
              <IconButton
                color="inherit"
                aria-label="open navigation menu"
                onClick={() => setMobileOpen(true)}
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="left"
                open={mobileOpen}
                onClose={() => {
                  setMobileOpen(false);
                  setMobileSubmenu(null);
                }}
              >
                <Box sx={{ width: 260, position: 'relative', overflow: 'hidden' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      width: '100%',
                      transform: mobileSubmenu ? 'translateX(-100%)' : 'translateX(0)',
                      transition: 'transform 300ms',
                    }}
                  >
                    <List sx={{ width: '100%', p: 1 }}>
                      {groups.map((group) =>
                        group.links.length === 1 ? (
                          <ListItemButton
                            key={group.links[0].to}
                            component={RouterLink}
                            to={group.links[0].to}
                            selected={location.pathname === group.links[0].to}
                            onClick={() => setMobileOpen(false)}
                            disabled={loading}
                            sx={DROPDOWN_ITEM_SX}
                          >
                            {group.links[0].badge ? (
                              <Badge color="error" badgeContent={group.links[0].badge}>
                                {group.links[0].label}
                              </Badge>
                            ) : (
                              group.links[0].label
                            )}
                          </ListItemButton>
                        ) : (
                          <ListItemButton
                            key={group.label}
                            onClick={() => setMobileSubmenu(group)}
                            sx={{
                              ...DROPDOWN_ITEM_SX,
                              display: 'flex',
                              justifyContent: 'space-between',
                            }}
                          >
                            {group.label}
                            <ChevronLeft fontSize="small" />
                          </ListItemButton>
                        )
                      )}

                      {onLogout &&
                        (name ? (
                          <>
                            <ListItemButton disabled sx={{ ...DROPDOWN_ITEM_SX, opacity: 0.6 }}>
                              {t('hello_name', { name })}
                            </ListItemButton>
                            {role === 'staff' &&
                              (profileLinks ?? []).map(({ label, to }) => (
                                <ListItemButton
                                  key={to}
                                  component={RouterLink}
                                  to={to}
                                  onClick={() => setMobileOpen(false)}
                                  disabled={loading}
                                  sx={DROPDOWN_ITEM_SX}
                                >
                                  {label}
                                </ListItemButton>
                              ))}
                            <ListItemButton
                              component={RouterLink}
                              to="/profile"
                              onClick={() => setMobileOpen(false)}
                              disabled={loading}
                              sx={DROPDOWN_ITEM_SX}
                            >
                              {t('profile')}
                            </ListItemButton>
                            <ListItemButton
                              component={RouterLink}
                              to="/help"
                              onClick={() => setMobileOpen(false)}
                              disabled={loading}
                              sx={DROPDOWN_ITEM_SX}
                            >
                              {t('help.title')}
                            </ListItemButton>
                            <ListItemButton
                              onClick={() => {
                                setMobileOpen(false);
                                onLogout?.();
                              }}
                              disabled={loading}
                              sx={DROPDOWN_ITEM_SX}
                            >
                              {t('logout')}
                            </ListItemButton>
                          </>
                        ) : (
                          <ListItemButton
                            onClick={() => {
                              setMobileOpen(false);
                              onLogout?.();
                            }}
                            disabled={loading}
                            sx={DROPDOWN_ITEM_SX}
                          >
                            {t('logout')}
                          </ListItemButton>
                        ))}
                    </List>
                  </Box>

                  {mobileSubmenu && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: mobileSubmenu ? 'translateX(0)' : 'translateX(100%)',
                        transition: 'transform 300ms',
                      }}
                    >
                      <List sx={{ width: '100%', p: 1 }}>
                        <ListItemButton
                          onClick={() => setMobileSubmenu(null)}
                          sx={{ ...DROPDOWN_ITEM_SX, justifyContent: 'flex-start' }}
                        >
                          <ChevronRight fontSize="small" sx={{ mr: 1 }} />
                          <ListItemText primary={mobileSubmenu.label} />
                        </ListItemButton>
                        {mobileSubmenu.links.map(({ label, to, badge }) => (
                          <ListItemButton
                            key={to}
                            component={RouterLink}
                            to={to}
                            selected={location.pathname === to}
                            onClick={() => {
                              setMobileOpen(false);
                              setMobileSubmenu(null);
                            }}
                            disabled={loading}
                            sx={DROPDOWN_ITEM_SX}
                          >
                            {badge ? (
                              <Badge color="error" badgeContent={badge}>
                                {label}
                              </Badge>
                            ) : (
                              label
                            )}
                          </ListItemButton>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              </Drawer>
            </>
          ) : (
            // Desktop links
            groups.map((group) =>
              group.links.length === 1 ? (
                <Button
                  key={group.links[0].to}
                  color="inherit"
                  component={RouterLink}
                  to={group.links[0].to}
                  disabled={loading}
                  disableElevation
                  disableRipple
                  sx={{
                    ...NAV_TXT_SX,
                    ...(location.pathname === group.links[0].to
                      ? { backgroundColor: 'rgba(255,255,255,0.12)' }
                      : null),
                  }}
                >
                  {group.links[0].badge ? (
                    <Badge color="error" badgeContent={group.links[0].badge}>
                      {group.links[0].label}
                    </Badge>
                  ) : (
                    group.links[0].label
                  )}
                </Button>
              ) : (
                <Box key={group.label} sx={{ display: 'inline-flex' }}>
                  <Button
                    color="inherit"
                    onClick={(e) => handleGroupClick(group.label, e)}
                    endIcon={openGroup === group.label ? <ExpandLess /> : <ExpandMore />}
                    disableElevation
                    disableRipple
                    sx={NAV_TXT_SX}
                    aria-haspopup="menu"
                    aria-expanded={openGroup === group.label ? 'true' : undefined}
                    aria-controls={`${group.label}-menu`}
                  >
                    {group.label}
                  </Button>
                  <Menu
                    id={`${group.label}-menu`}
                    anchorEl={anchorEl}
                    open={openGroup === group.label}
                    onClose={closeGroup}
                    PaperProps={menuPaperProps}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    MenuListProps={{ dense: true, disablePadding: true }}
                  >
                    {group.links.map(({ label, to, badge }) => (
                      <MenuItem
                        key={to}
                        component={RouterLink}
                        to={to}
                        selected={location.pathname === to}
                        onClick={closeGroup}
                        disabled={loading}
                        sx={DROPDOWN_ITEM_SX}
                      >
                        {badge ? (
                          <Badge color="error" badgeContent={badge}>
                            {label}
                          </Badge>
                        ) : (
                          label
                        )}
                      </MenuItem>
                    ))}
                  </Menu>
                </Box>
              )
            )
          )}

          {/* Profile menu / Logout on desktop */}
          {onLogout &&
            (name && !isSmall ? (
              <>
                <Button
                  color="inherit"
                  onClick={handleProfileClick}
                  endIcon={profileMenuOpen ? <ExpandLess /> : <ExpandMore />}
                  disableElevation
                  disableRipple
                  sx={NAV_TXT_SX}
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen ? 'true' : undefined}
                  aria-controls="profile-menu"
                >
                  {t('hello_name', { name })}
                </Button>
                <Menu
                  id="profile-menu"
                  anchorEl={profileAnchorEl}
                  open={profileMenuOpen}
                  onClose={closeProfileMenu}
                  PaperProps={menuPaperProps}
                  anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  MenuListProps={{ dense: true, disablePadding: true }}
                >
                  {role === 'staff' &&
                    profileLinks?.map(({ label, to }) => (
                      <MenuItem
                        key={to}
                        component={RouterLink}
                        to={to}
                        onClick={closeProfileMenu}
                        disabled={loading}
                        sx={DROPDOWN_ITEM_SX}
                      >
                        {label}
                      </MenuItem>
                    ))}
                  <MenuItem
                    component={RouterLink}
                    to="/profile"
                    onClick={closeProfileMenu}
                    disabled={loading}
                    sx={DROPDOWN_ITEM_SX}
                  >
                    {t('profile')}
                  </MenuItem>
                  <MenuItem
                    component={RouterLink}
                    to="/help"
                    onClick={closeProfileMenu}
                    disabled={loading}
                    sx={DROPDOWN_ITEM_SX}
                  >
                    {t('help.title')}
                  </MenuItem>
                  <MenuItem
                    onClick={() => {
                      closeProfileMenu();
                      onLogout();
                    }}
                    disabled={loading}
                    sx={DROPDOWN_ITEM_SX}
                  >
                    {t('logout')}
                  </MenuItem>
                </Menu>
              </>
            ) : !name && !isSmall ? (
              <Button color="inherit" onClick={onLogout} disabled={loading} sx={NAV_TXT_SX}>
                {t('logout')}
              </Button>
            ) : null)}

        </Toolbar>
      </AppBar>
    </Box>
  );
}
