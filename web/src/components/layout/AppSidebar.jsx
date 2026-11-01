import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Waves, LogOut, ChevronsUpDown } from 'lucide-react';
import {
    Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
    SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from '@/components/ui/sidebar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '../../contexts/AuthContext';
import { NAV } from './nav';

function UserMenu() {
    const { user, clearAuth } = useAuth();
    const navigate = useNavigate();
    const { isMobile } = useSidebar();
    const name = user?.fullName || 'Account';
    const role = user?.role?.name || user?.role?.code?.replaceAll('_', ' ') || '';
    const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <Avatar className="size-8 rounded-lg">
                        <AvatarFallback className="rounded-lg bg-accent text-accent-foreground text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{name}</span>
                        <span className="truncate text-xs text-muted-foreground">{role}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={isMobile ? 'bottom' : 'right'} align="end" className="min-w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="text-sm font-medium">{name}</div>
                    <div className="text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { clearAuth(); navigate('/login'); }}>
                    <LogOut /> Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function AppSidebar() {
    const { pathname } = useLocation();
    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <NavLink to="/admin/dashboard">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <Waves className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left leading-tight">
                                    <span className="font-semibold">DDAS</span>
                                    <span className="text-xs text-muted-foreground">Operations centre</span>
                                </div>
                            </NavLink>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {NAV.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map(({ to, label, icon: Icon }) => (
                                    <SidebarMenuItem key={to}>
                                        <SidebarMenuButton asChild tooltip={label} isActive={pathname.startsWith(`/admin/${to}`)}>
                                            <NavLink to={`/admin/${to}`} onClick={() => isMobile && setOpenMobile(false)}>
                                                <Icon />
                                                <span>{label}</span>
                                            </NavLink>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <UserMenu />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
