import { NavLink, useNavigate } from 'react-router-dom';
import { Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography, Tooltip, Divider, Button } from '@mui/material';
import DashboardRounded from '@mui/icons-material/DashboardRounded';
import WaterRounded from '@mui/icons-material/WaterRounded';
import SensorsRounded from '@mui/icons-material/SensorsRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import VpnKeyRounded from '@mui/icons-material/VpnKeyRounded';
import PeopleRounded from '@mui/icons-material/PeopleRounded';
import PublicRounded from '@mui/icons-material/PublicRounded';
import ShieldRounded from '@mui/icons-material/ShieldRounded';
import NewspaperRounded from '@mui/icons-material/NewspaperRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import SettingsRounded from '@mui/icons-material/SettingsRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import AssignmentRounded from '@mui/icons-material/AssignmentRounded';
import AutoGraphRounded from '@mui/icons-material/AutoGraphRounded';
import SmartToyRounded from '@mui/icons-material/SmartToyRounded';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../../contexts/AuthContext';

const groups = [
  ['Overview', [['dashboard', 'Dashboard', DashboardRounded]]],
  ['Monitoring', [['reports', 'Reports', AssignmentRounded], ['dams', 'Dams', WaterRounded], ['sensors', 'Sensors', SensorsRounded], ['alerts', 'Alerts', NotificationsRounded], ['device-keys', 'Device keys', VpnKeyRounded]]],
  ['AI & Intelligence', [['ml-operations', 'ML Operations', AutoGraphRounded], ['ai-assistant', 'SOP Assistant', SmartToyRounded]]],
  ['Management', [['users', 'Users', PeopleRounded], ['regions', 'Regions', PublicRounded], ['roles', 'Roles', ShieldRounded], ['news', 'News', NewspaperRounded], ['system-safe-locations-test', 'Safe locations', PlaceRounded]]],
  ['System', [['settings', 'Settings', SettingsRounded], ['mapFunc', 'Map editor', MapRounded]]],
];
export default function Sidebar({ collapsed, desktop, mobileOpen, onClose }) {
  const { clearAuth } = useAuth();
  const navigate = useNavigate();
  const compact = desktop && collapsed;
  return <Drawer variant={desktop ? 'permanent' : 'temporary'} open={desktop || mobileOpen} onClose={onClose} slotProps={{ paper: { sx: { width: compact ? 88 : 272, border: 0, p: 1.5 } } }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, minHeight: 72 }}>
      <WaterRounded sx={{ fontSize: 28, color: 'primary.main', flexShrink: 0 }} />
      {!compact && <Box><Typography fontWeight={700}>DDAS</Typography><Typography variant="caption" color="text.secondary">Operations centre</Typography></Box>}
    </Box>
    <List component="nav" aria-label="Main navigation" sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
      {groups.map(([group, items]) => <Box key={group} sx={{ mb: 2 }}>
        {!compact && <Typography variant="overline" sx={{ px: 2, color: 'text.secondary', fontSize: 11 }}>{group}</Typography>}
        {items.map(([path, label, Icon]) => <Tooltip key={path} title={compact ? label : ''} placement="right">
          <ListItemButton component={NavLink} to={`/admin/${path}`} onClick={onClose} aria-label={compact ? label : undefined} sx={{ minHeight: 48, borderRadius: '28px', mb: 0.5, px: compact ? 1.5 : 2, justifyContent: compact ? 'center' : 'flex-start', '&.active': { backgroundColor: 'var(--md-secondary-container)', color: 'var(--md-on-secondary-container)' }, '&:hover': { backgroundColor: 'var(--md-surface-container-high)' } }}>
            <ListItemIcon sx={{ minWidth: compact ? 0 : 40, color: 'inherit' }}><Icon /></ListItemIcon>
            {!compact && <ListItemText primary={label} slotProps={{ primary: { fontSize: 14, fontWeight: 500 } }} />}
          </ListItemButton>
        </Tooltip>)}
      </Box>)}
    </List>
    <Divider sx={{ my: 1 }} />
    <Tooltip title={compact ? 'Sign out' : ''}><Button onClick={() => { clearAuth(); onClose(); navigate('/login'); }} aria-label="Sign out" startIcon={compact ? undefined : <LogoutRounded />} sx={{ color: 'text.secondary', minWidth: 0 }}>{compact ? <LogoutRounded /> : 'Sign out'}</Button></Tooltip>
  </Drawer>;
}
