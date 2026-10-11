import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppBar, Toolbar, IconButton, Typography, Box, Avatar, Menu, MenuItem, ListItemIcon, Divider, Tooltip } from '@mui/material';
import MenuRounded from '@mui/icons-material/MenuRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import AccountCircleRounded from '@mui/icons-material/AccountCircleRounded';
import { useAuth } from '../../contexts/AuthContext';

export default function TopBar({ onMenuClick }) {
  const { user, clearAuth } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [anchor, setAnchor] = useState(null);
  const initials = (user?.fullName || 'DDAS').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const section = pathname.split('/')[2]?.replaceAll('-', ' ') || 'Dashboard';
  return <AppBar position="sticky" color="transparent" elevation={0} sx={{ bgcolor: 'var(--md-surface)', borderBottom: '1px solid var(--md-outline-variant)' }}>
    <a href="#main-content" className="md-skip-link">Skip to content</a>
    <Toolbar sx={{ gap: 2, minHeight: 72 }}>
      <Tooltip title="Toggle navigation"><IconButton onClick={onMenuClick} edge="start" aria-label="Toggle navigation"><MenuRounded /></IconButton></Tooltip>
      <Typography variant="body1" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>{section === 'mapFunc' ? 'Map editor' : section === 'system safe locations test' ? 'Safe locations' : section}</Typography>
      <Box sx={{ flex: 1 }} />
      <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right' }}><Typography variant="body2" fontWeight={600}>{user?.fullName || 'Account'}</Typography><Typography variant="caption" color="text.secondary">{user?.role?.name || user?.role?.code?.replaceAll('_', ' ') || 'DDAS'}</Typography></Box>
      <Tooltip title="Account menu"><IconButton onClick={e => setAnchor(e.currentTarget)} aria-label="Account menu" aria-controls={anchor ? 'account-menu' : undefined} aria-haspopup="true" aria-expanded={!!anchor}><Avatar sx={{ width: 36, height: 36, bgcolor: 'var(--md-primary-container)', color: 'var(--md-on-primary-container)', fontSize: 14 }}>{initials}</Avatar></IconButton></Tooltip>
      <Menu id="account-menu" anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { minWidth: 220, borderRadius: 3, mt: 1 } } }}>
        <MenuItem disabled><ListItemIcon><AccountCircleRounded /></ListItemIcon>{user?.email || 'Signed in'}</MenuItem>
        <Divider />
        <MenuItem onClick={() => { setAnchor(null); clearAuth(); navigate('/login'); }}><ListItemIcon><LogoutRounded /></ListItemIcon>Sign out</MenuItem>
      </Menu>
    </Toolbar>
  </AppBar>;
}
