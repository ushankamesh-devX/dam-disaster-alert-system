import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from '../components/dashboard/Sidebar';
import TopBar from '../components/dashboard/TopBar';

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const desktop = useMediaQuery(useTheme().breakpoints.up('lg'));
  const width = collapsed ? 88 : 272;
  return <Box className="md-admin-shell md-dotted-background" sx={{ display: 'flex', minHeight: '100dvh' }}>
    <Sidebar collapsed={collapsed} desktop={desktop} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    <Box sx={{ flex: 1, minWidth: 0, ml: desktop ? `${width}px` : 0, transition: 'margin-left 200ms ease' }}>
      <TopBar onMenuClick={() => desktop ? setCollapsed(v => !v) : setMobileOpen(true)} />
      <Box component="main" id="main-content" className="md-page" sx={{ p: { xs: 2, md: 3, xl: 4 }, minWidth: 0 }}><Outlet /></Box>
    </Box>
  </Box>;
}
