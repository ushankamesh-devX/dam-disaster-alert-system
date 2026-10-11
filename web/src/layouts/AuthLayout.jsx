import { Outlet } from 'react-router-dom';
import { Box, Paper, Typography, Chip, Stack } from '@mui/material';
import WaterRounded from '@mui/icons-material/WaterRounded';
import SensorsRounded from '@mui/icons-material/SensorsRounded';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import PublicRounded from '@mui/icons-material/PublicRounded';

export default function AuthLayout() {
  return <Box className="md-dotted-background" sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' } }}>
    <Box sx={{ display: { xs: 'none', lg: 'flex' }, flexDirection: 'column', justifyContent: 'space-between', bgcolor: 'var(--md-on-primary-container)', color: 'var(--md-on-primary)', backgroundImage: 'linear-gradient(180deg, rgba(20, 33, 61, 0.35), rgba(0, 77, 64, 0.85)), url("https://i2.wp.com/amazinglanka.com/wp/wp-content/uploads/2016/09/IMG-20110419-00085.jpg?ssl=1")', backgroundSize: 'cover', backgroundPosition: 'center', m: 2, borderRadius: '28px', p: { lg: 6, xl: 8 } }}>
      <Stack direction="row" spacing={2} alignItems="center"><WaterRounded sx={{ fontSize: 40 }} /><Typography fontWeight={700} fontSize={22}>DDAS</Typography></Stack>
      <Box sx={{ my: 8 }}>
        <WaterRounded sx={{ fontSize: 100, mb: 3 }} />
        <Typography component="h1" sx={{ fontSize: { lg: 44, xl: 56 }, lineHeight: 1.15, fontWeight: 600, letterSpacing: '-0.03em', mb: 3 }}>Dam Disaster<br />Alert System</Typography>
        <Typography sx={{ maxWidth: 440, fontSize: 18, lineHeight: 1.7, opacity: 0.8 }}>Monitor dam conditions, manage sensor data and coordinate alerts across Sri Lanka.</Typography>
        <Stack spacing={1.5} direction="row" flexWrap="wrap" useFlexGap sx={{ mt: 4, '& .MuiChip-root': { color: 'inherit', borderColor: 'rgba(255, 255, 255, 0.45)', backgroundColor: 'rgba(255, 255, 255, 0.1)' }, '& .MuiChip-icon': { color: 'inherit' } }}>
          <Chip icon={<SensorsRounded />} label="Monitoring" variant="outlined" />
          <Chip icon={<NotificationsRounded />} label="Alerts" variant="outlined" />
          <Chip icon={<PublicRounded />} label="Regions" variant="outlined" />
        </Stack>
      </Box>
      <Typography variant="caption">© {new Date().getFullYear()} DDAS</Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: { xs: 2, sm: 4, lg: 6 } }}>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 520, p: { xs: 3, sm: 5 }, borderRadius: '28px' }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ display: { lg: 'none' }, mb: 4 }}><WaterRounded color="primary" /><Typography fontWeight={700}>DDAS</Typography></Stack>
        <Outlet />
      </Paper>
    </Box>
  </Box>;
}
