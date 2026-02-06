import { NavLink } from "react-router-dom";
import { Home, Moon, Sun, Users, UsersRound, FolderKanban, CalendarDays } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="text-lg font-semibold px-2">MPS</span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end className={({ isActive }) => isActive ? "font-semibold" : ""}>
                    <Home className="size-4" />
                    Dashboard
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/users" className={({ isActive }) => isActive ? "font-semibold" : ""}>
                    <Users className="size-4" />
                    Users
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/teams" className={({ isActive }) => isActive ? "font-semibold" : ""}>
                    <UsersRound className="size-4" />
                    Teams
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/projects" className={({ isActive }) => isActive ? "font-semibold" : ""}>
                    <FolderKanban className="size-4" />
                    Projects
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/schedules" className={({ isActive }) => isActive ? "font-semibold" : ""}>
                    <CalendarDays className="size-4" />
                    Schedules
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={toggleTheme}>
                  {theme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2">
          <div className="size-8 rounded-full bg-muted" />
          <span className="text-sm">User Name</span>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
