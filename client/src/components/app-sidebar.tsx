import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { Moon, Sun, LayoutDashboard, Users, UsersRound, FolderKanban, CalendarDays, ClipboardList, LogOut, SlidersHorizontal, ChevronRight } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useSession, signOut } from "@/lib/auth-client";
import { apolloClient, setActiveSpaceId } from "@/lib/apollo-client";
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function AppSidebar() {
  const { theme, toggleTheme } = useTheme();
  const { data: session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const user = session?.user;
  const usersOpen = location.pathname.startsWith("/users");

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center justify-between px-2">
          <span className="text-lg font-semibold">MPS</span>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === "/"}>
                  <NavLink to="/" end>
                    <LayoutDashboard className="size-4" />
                    Dashboard
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Collapsible defaultOpen={usersOpen}>
                  <div className="flex items-center">
                    <SidebarMenuButton asChild className="flex-1" isActive={location.pathname === "/users"}>
                      <NavLink to="/users" end>
                        <Users className="size-4" />
                        Users
                      </NavLink>
                    </SidebarMenuButton>
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="group flex size-7 shrink-0 items-center justify-center rounded-md hover:bg-accent transition-colors"
                      >
                        <ChevronRight className="size-4 transition-transform group-data-[state=open]:rotate-90" />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild isActive={location.pathname === "/users/tenure"}>
                          <NavLink to="/users/tenure">
                            Tenure
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/teams")}>
                  <NavLink to="/teams">
                    <UsersRound className="size-4" />
                    Teams
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/projects")}>
                  <NavLink to="/projects">
                    <FolderKanban className="size-4" />
                    Projects
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/schedules")}>
                  <NavLink to="/schedules">
                    <CalendarDays className="size-4" />
                    Schedules
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/work-history")}>
                  <NavLink to="/work-history">
                    <ClipboardList className="size-4" />
                    Work History
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname.startsWith("/space-settings")}>
                  <NavLink to="/space-settings">
                    <SlidersHorizontal className="size-4" />
                    Space Settings
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2">
          <Link to="/settings" className="flex items-center gap-2 flex-1 min-w-0 rounded-md hover:bg-accent transition-colors p-1 -m-1">
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
          </Link>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              setActiveSpaceId(null);
              localStorage.removeItem("mps-active-space-id");
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
