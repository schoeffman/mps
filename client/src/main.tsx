import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import Root from "./routes/root";
import Home from "./routes/home";
import Users from "./routes/users";
import Teams from "./routes/teams";
import TeamDetail from "./routes/team-detail";
import UserDetail from "./routes/user-detail";
import Projects from "./routes/projects";
import ProjectDetail from "./routes/project-detail";
import Schedule from "./routes/schedule";
import "./index.css";

const apolloClient = new ApolloClient({
  uri: "/graphql",
  cache: new InMemoryCache(),
});

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      { index: true, element: <Home /> },
      { path: "users", element: <Users /> },
      { path: "users/:id", element: <UserDetail /> },
      { path: "teams", element: <Teams /> },
      { path: "teams/:id", element: <TeamDetail /> },
      { path: "projects", element: <Projects /> },
      { path: "projects/:id", element: <ProjectDetail /> },
      { path: "schedule", element: <Schedule /> },
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
