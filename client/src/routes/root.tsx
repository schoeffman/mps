import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SpaceSwitcher } from "@/components/space-switcher";

export default function Root() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <SpaceSwitcher />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 min-w-0">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
