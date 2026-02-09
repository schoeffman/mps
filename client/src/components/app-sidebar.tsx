import { NavLink, useNavigate } from "react-router-dom";
import { Home, Moon, Sun, Users, UsersRound, FolderKanban, CalendarDays, LogOut } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useSession, signOut } from "@/lib/auth-client";
import { apolloClient } from "@/lib/apollo-client";
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
  const { data: session } = useSession();
  const navigate = useNavigate();

  const user = session?.user;

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
          {user?.image ? (
            <img
              src={user.image}
              alt=""
              className="size-8 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="size-8 rounded-full bg-muted" />
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.name ?? "User"}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              await apolloClient.clearStore();
              navigate("/login");
            }}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
