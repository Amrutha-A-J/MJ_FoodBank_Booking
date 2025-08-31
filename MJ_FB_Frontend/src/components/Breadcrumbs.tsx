import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function formatSegment(segment: string) {
  return segment
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const { t } = useTranslation();

  return (
    <MuiBreadcrumbs aria-label={t('breadcrumb')} sx={{ mb: 2 }}>
      <Link component={RouterLink} underline="hover" color="inherit" to="/">
        {t('home')}
      </Link>
      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const label = formatSegment(value);
        return index === pathnames.length - 1 ? (
          <Typography color="text.primary" key={to}>
            {label}
          </Typography>
        ) : (
          <Link component={RouterLink} underline="hover" color="inherit" to={to} key={to}>
            {label}
          </Link>
        );
      })}
    </MuiBreadcrumbs>
  );
}

