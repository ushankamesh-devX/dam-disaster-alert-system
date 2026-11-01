import {
    LayoutDashboard, Siren, Bell, Waves, RadioTower, ClipboardList, BrainCircuit, Bot,
    Users, ShieldCheck, Globe, Newspaper, MapPin, KeyRound, Map, Settings,
} from 'lucide-react';

// Grouped by what an operator does: respond first, then monitor, then administer.
export const NAV = [
    {
        label: 'Operations', items: [
            { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: 'evacuation', label: 'Evacuation', icon: Siren },
            { to: 'alerts', label: 'Alerts', icon: Bell },
        ],
    },
    {
        label: 'Monitoring', items: [
            { to: 'dams', label: 'Dams', icon: Waves },
            { to: 'sensors', label: 'Sensors', icon: RadioTower },
            { to: 'reports', label: 'Reports', icon: ClipboardList },
        ],
    },
    {
        label: 'Intelligence', items: [
            { to: 'ml-operations', label: 'ML Operations', icon: BrainCircuit },
            { to: 'ai-assistant', label: 'SOP Assistant', icon: Bot },
        ],
    },
    {
        label: 'Administration', items: [
            { to: 'users', label: 'Users', icon: Users },
            { to: 'roles', label: 'Roles', icon: ShieldCheck },
            { to: 'regions', label: 'Regions', icon: Globe },
            { to: 'news', label: 'News', icon: Newspaper },
            { to: 'system-safe-locations-test', label: 'Safe locations', icon: MapPin },
            { to: 'device-keys', label: 'Device keys', icon: KeyRound },
            { to: 'mapFunc', label: 'Map editor', icon: Map },
            { to: 'settings', label: 'Settings', icon: Settings },
        ],
    },
];

/** Section and page title for the top bar, e.g. ["Monitoring", "Dams"]. */
export function pageTrail(pathname) {
    const segment = pathname.split('/')[2] || 'dashboard';
    for (const group of NAV) {
        const item = group.items.find((i) => i.to === segment);
        if (item) return [group.label, item.label];
    }
    return ['', segment.replaceAll('-', ' ')];
}
