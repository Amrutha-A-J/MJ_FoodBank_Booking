import { useMemo, useState, type ComponentType, type ReactNode } from 'react';
import type { ReactElement } from 'react';
import { Paper, Tabs, Tab, Box, type SxProps, type Theme } from '@mui/material';

interface BaseTabItem {
  label: ReactNode;
  icon?: ReactElement;
}

interface TabItemWithContent extends BaseTabItem {
  content: ReactNode;
  renderContent?: never;
  component?: never;
}

interface TabItemWithRenderer extends BaseTabItem {
  content?: never;
  renderContent: () => ReactNode;
  component?: never;
}

interface TabItemWithComponent extends BaseTabItem {
  content?: never;
  renderContent?: never;
  component: ComponentType;
}

export type TabItem = TabItemWithContent | TabItemWithRenderer | TabItemWithComponent;

interface StyledTabsProps {
  tabs: TabItem[];
  value?: number;
  onChange?: (event: React.SyntheticEvent, newValue: number) => void;
  sx?: SxProps<Theme>;
}

export default function StyledTabs({ tabs, value: valueProp, onChange, sx }: StyledTabsProps) {
  const [internal, setInternal] = useState(0);
  const value = valueProp ?? internal;

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    onChange?.(event, newValue);
    if (valueProp === undefined) setInternal(newValue);
  };

  const tabHeaders = useMemo(
    () =>
      tabs.map((tab, index) => {
        const tabId = `tab-${index}`;
        const panelId = `tabpanel-${index}`;
        return (
          <Tab
            key={tabId}
            label={tab.label}
            icon={tab.icon}
            iconPosition={tab.icon ? 'start' : undefined}
            id={tabId}
            aria-controls={panelId}
          />
        );
      }),
    [tabs],
  );

  const renderTabContent = (tab: TabItem): ReactNode => {
    if ('renderContent' in tab && tab.renderContent) return tab.renderContent();
    if ('component' in tab && tab.component) {
      const Component = tab.component;
      return <Component />;
    }
    return tab.content;
  };

  const tabPanels = useMemo(
    () =>
      tabs.map((tab, index) => {
        const tabId = `tab-${index}`;
        const panelId = `tabpanel-${index}`;
        return (
          <div
            key={panelId}
            role="tabpanel"
            hidden={value !== index}
            id={panelId}
            aria-labelledby={tabId}
          >
            <Box sx={{ pt: 2, display: value === index ? 'block' : 'none' }}>{renderTabContent(tab)}</Box>
          </div>
        );
      }),
    [tabs, value],
  );

  return (
    <Paper sx={{ p: 2, ...(sx as object) }}>
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
        aria-label="styled tabs"
      >
        {tabHeaders}
      </Tabs>
      {tabPanels}
    </Paper>
  );
}

