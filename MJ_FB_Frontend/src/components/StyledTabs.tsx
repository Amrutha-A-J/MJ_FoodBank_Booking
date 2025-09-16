import { useMemo, useState, type ReactNode } from 'react';
import type { ReactElement } from 'react';
import { Paper, Tabs, Tab, Box, type SxProps, type Theme } from '@mui/material';

export interface TabItem {
  label: ReactNode;
  icon?: ReactElement;
  content: ReactNode;
}

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

  const tabItems = useMemo(
    () =>
      tabs.map((tab, index) => ({
        ...tab,
        tabId: `tab-${index}`,
        panelId: `tabpanel-${index}`,
      })),
    [tabs],
  );

  const tabHeaders = useMemo(
    () =>
      tabItems.map((tab) => (
        <Tab
          key={tab.tabId}
          label={tab.label}
          icon={tab.icon}
          iconPosition={tab.icon ? 'start' : undefined}
          id={tab.tabId}
          aria-controls={tab.panelId}
        />
      )),
    [tabItems],
  );

  const tabPanels = useMemo(
    () =>
      tabItems.map((tab, index) => (
        <div
          key={tab.panelId}
          role="tabpanel"
          hidden={value !== index}
          id={tab.panelId}
          aria-labelledby={tab.tabId}
        >
          <Box sx={{ pt: 2, display: value === index ? 'block' : 'none' }}>{tab.content}</Box>
        </div>
      )),
    [tabItems, value],
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

