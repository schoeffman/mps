import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "./lib/apollo-client";
import { ProtectedRoute } from "./components/protected-route";
import Login from "./routes/login";
import Root from "./routes/root";
import Users from "./routes/users";
import Performance from "./routes/performance";
import Teams from "./routes/teams";
import TeamDetail from "./routes/team-detail";
import UserDetail from "./routes/user-detail";
import Projects from "./routes/projects";
import ProjectDetail from "./routes/project-detail";
import Schedules from "./routes/schedules";
import ScheduleDetail from "./routes/schedule-detail";
import Settings from "./routes/settings";
import SpaceSettings from "./routes/space-settings";
import WorkHistory from "./routes/work-history";
import Dashboard from "./routes/dashboard";
import "./index.css";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: "/",
        element: <Root />,
        children: [
          { index: true, element: <Dashboard /> },
          { path: "users", element: <Users /> },
          { path: "users/performance", element: <Performance /> },
          { path: "users/:id", element: <UserDetail /> },
          { path: "teams", element: <Teams /> },
          { path: "teams/:id", element: <TeamDetail /> },
          { path: "projects", element: <Projects /> },
          { path: "projects/:id", element: <ProjectDetail /> },
          { path: "schedules", element: <Schedules /> },
          { path: "schedules/:id", element: <ScheduleDetail /> },
          { path: "work-history", element: <WorkHistory /> },
          { path: "settings", element: <Settings /> },
          { path: "space-settings", element: <SpaceSettings /> },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ApolloProvider client={apolloClient}>
      <RouterProvider router={router} />
    </ApolloProvider>
  </StrictMode>,
);
