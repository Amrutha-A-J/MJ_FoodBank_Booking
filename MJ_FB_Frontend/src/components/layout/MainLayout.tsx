import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Navbar, { type NavGroup, type NavLink } from '../Navbar';
import Breadcrumbs from '../Breadcrumbs';
import PageContainer from './PageContainer';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface MainLayoutProps {
  groups: NavGroup[];
  onLogout?: () => void;
  name?: string;
  loading?: boolean;
  profileLinks?: NavLink[];
  role?: string;
  children: ReactNode;
}

const setDocumentTitle = (title: string) => {
  document.title = title ? `MJ Foodbank - ${title}` : 'MJ Foodbank';
};

const PageTitleContext = createContext<(title: string) => void>(setDocumentTitle);

export function usePageTitle(title: string) {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title);
  }, [setTitle, title]);
}

export default function MainLayout({ children, ...navbarProps }: MainLayoutProps) {
  const [title, setTitle] = useState('');
  const theme = useTheme();

  useEffect(() => {
    document.title = title ? `MJ Foodbank - ${title}` : 'MJ Foodbank';
  }, [title]);

  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = theme.palette.background.default;
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, [theme]);

  return (
    <PageTitleContext.Provider value={setTitle}>
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
        <Navbar {...navbarProps} />
        <PageContainer component="main">
          <Breadcrumbs />
          {children}
        </PageContainer>
      </Box>
    </PageTitleContext.Provider>
  );
}
