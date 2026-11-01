import { Outlet, useLocation } from 'react-router-dom';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import AppSidebar from '../components/layout/AppSidebar';
import { pageTrail } from '../components/layout/nav';

// Pages with a map that should fill the screen get no page padding (see .ddas-full-map).
const FULL_SCREEN = ['evacuation', 'mapFunc', 'system-safe-locations-test'];

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [section, page] = pageTrail(pathname);
  const parts = pathname.split('/');
  const fullScreen = (FULL_SCREEN.includes(parts[2]) && parts.length === 3)
    || /^\/admin\/dams\/[^/]+\/map$/.test(pathname);

  return (
    <SidebarProvider>
      <a href="#main-content" className="md-skip-link">Skip to content</a>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {section && <BreadcrumbItem className="hidden md:block text-muted-foreground">{section}</BreadcrumbItem>}
              {section && <BreadcrumbSeparator className="hidden md:block" />}
              <BreadcrumbItem><BreadcrumbPage className="capitalize font-medium">{page}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main
          id="main-content"
          className={fullScreen ? 'ddas-full-map min-w-0 p-3' : 'md-page min-w-0 p-4 md:p-6'}
        >
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
