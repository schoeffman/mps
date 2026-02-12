import { useQuery, gql } from "@apollo/client";
import { ProjectsList } from "@/components/projects-list";
import { AddProjectDialog } from "@/components/add-project-dialog";

export const GET_PROJECTS = gql`
  query GetProjects {
    projects {
      id
      name
      targetDate
      dri {
        id
        fullName
      }
      status
      color
      projectType
      members {
        id
        fullName
      }
      createdAt
    }
  }
`;

export default function Projects() {
  const { loading, error, data } = useQuery(GET_PROJECTS);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <AddProjectDialog />
      </div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {data && <ProjectsList projects={data.projects} />}
    </>
  );
}
