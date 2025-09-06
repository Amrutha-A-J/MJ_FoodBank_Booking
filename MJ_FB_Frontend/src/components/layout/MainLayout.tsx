import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Navbar, { type NavGroup, type NavLink } from '../Navbar';
import Breadcrumbs from '../Breadcrumbs';
import PageContainer from './PageContainer';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

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
const BreadcrumbActionsContext = createContext<
  (actions: ReactNode | null) => void
>(() => {});

export function usePageTitle(title: string) {
  const setTitle = useContext(PageTitleContext);
  useEffect(() => {
    setTitle(title);
  }, [setTitle, title]);
}

export function useBreadcrumbActions(actions: ReactNode | null) {
  const setActions = useContext(BreadcrumbActionsContext);
  useEffect(() => {
    setActions(actions);
    return () => setActions(null);
  }, [actions, setActions]);
}

export default function MainLayout({ children, ...navbarProps }: MainLayoutProps) {
  const [title, setTitle] = useState('');
  const [actions, setActions] = useState<ReactNode | null>(null);
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
      <BreadcrumbActionsContext.Provider value={setActions}>
        <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
          <Navbar {...navbarProps} />
          <PageContainer component="main">
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Breadcrumbs />
              {actions}
            </Box>
            {children}
          </PageContainer>
        </Box>
      </BreadcrumbActionsContext.Provider>
    </PageTitleContext.Provider>
  );
}
