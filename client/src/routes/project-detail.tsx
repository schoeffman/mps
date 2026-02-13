import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import { GET_PROJECTS } from "@/routes/projects";
import { ArrowLeft, Trash2, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const GET_PROJECT = gql`
  query GetProject($id: Int!) {
    project(id: $id) {
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
      links {
        id
        url
        createdAt
      }
      createdAt
    }
  }
`;

const DELETE_PROJECT = gql`
  mutation DeleteProject($id: Int!) {
    deleteProject(id: $id)
  }
`;

const ADD_PROJECT_LINK = gql`
  mutation AddProjectLink($projectId: Int!, $url: String!) {
    addProjectLink(projectId: $projectId, url: $url) {
      id
      url
      createdAt
    }
  }
`;

const REMOVE_PROJECT_LINK = gql`
  mutation RemoveProjectLink($id: Int!) {
    removeProjectLink(id: $id)
  }
`;

const GET_PROJECT_ASSIGNMENTS = gql`
  query GetProjectAssignments($projectId: Int!) {
    projectAssignments(projectId: $projectId) {
      user {
        id
        fullName
      }
      teamName
      dateRanges {
        start
        end
        scheduleName
      }
    }
  }
`;

const enumLabels: Record<string, string> = {
  ProductManagement: "Product Management",
  DataScience: "Data Science",
  NotApplicable: "Not Applicable",
  FeatureDevelopment: "Feature Development",
};

function formatEnum(value: string) {
  return enumLabels[value] ?? value;
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (start === end) {
    return s.toLocaleDateString(undefined, { ...opts, year: "numeric" });
  }
  if (s.getFullYear() === e.getFullYear()) {
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
  }
  return `${s.toLocaleDateString(undefined, { ...opts, year: "numeric" })} – ${e.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const projectId = Number(id);
  const { loading, error, data } = useQuery(GET_PROJECT, {
    variables: { id: projectId },
  });
  const [deleteProject] = useMutation(DELETE_PROJECT, {
    refetchQueries: [{ query: GET_PROJECTS }],
  });
  const [addProjectLink, { loading: addingLink }] = useMutation(ADD_PROJECT_LINK, {
    refetchQueries: [{ query: GET_PROJECT, variables: { id: projectId } }],
  });
  const [removeProjectLink] = useMutation(REMOVE_PROJECT_LINK, {
    refetchQueries: [{ query: GET_PROJECT, variables: { id: projectId } }],
  });

  const { data: assignmentsData } = useQuery(GET_PROJECT_ASSIGNMENTS, {
    variables: { projectId },
    fetchPolicy: "cache-and-network",
  });

  const [linkUrl, setLinkUrl] = useState("");

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data?.project) return <p>Project not found.</p>;

  const { project } = data;

  async function handleDelete() {
    await deleteProject({ variables: { id: projectId } });
    navigate("/projects");
  }

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    await addProjectLink({ variables: { projectId, url: linkUrl.trim() } });
    setLinkUrl("");
  }

  async function handleRemoveLink(linkId: number) {
    await removeProjectLink({ variables: { id: linkId } });
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/projects">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <div className="flex gap-1 ml-2">
          <EditProjectDialog project={project} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete project</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {project.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <Button variant="destructive" onClick={handleDelete}>
                    Delete
                  </Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mb-6 text-sm text-muted-foreground space-y-1">
        <p>DRI: {project.dri.fullName}</p>
        <p>Type: {formatEnum(project.projectType)}</p>
        <p>Status: {project.status}</p>
        <p>Target Date: {new Date(project.targetDate).toLocaleDateString()}</p>
        <p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
      </div>

      {/* Team Members Section */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Team Members</h2>
        {assignmentsData?.projectAssignments?.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Dates</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignmentsData.projectAssignments.flatMap(
                (assignment: { user: { id: number; fullName: string }; teamName: string | null; dateRanges: { start: string; end: string; scheduleName: string }[] }) =>
                  assignment.dateRanges.map((range, i) => (
                    <TableRow key={`${assignment.user.id}-${i}`}>
                      {i === 0 ? (
                        <>
                          <TableCell rowSpan={assignment.dateRanges.length} className="font-medium align-top">
                            {assignment.user.fullName}
                          </TableCell>
                          <TableCell rowSpan={assignment.dateRanges.length} className="align-top text-muted-foreground">
                            {assignment.teamName ?? "—"}
                          </TableCell>
                        </>
                      ) : null}
                      <TableCell>{range.scheduleName}</TableCell>
                      <TableCell>{formatDateRange(range.start, range.end)}</TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No team members scheduled.</p>
        )}
      </section>

      {/* Links Section */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">Links</h2>
        {project.links.length > 0 && (
          <div className="space-y-2 mb-3">
            {project.links.map((link: { id: number; url: string }) => (
              <div key={link.id} className="flex items-center gap-2 rounded-lg border p-2">
                <a href={link.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="size-4" />
                </a>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate flex-1 min-w-0"
                >
                  {link.url}
                </a>
                <button
                  type="button"
                  onClick={() => handleRemoveLink(link.id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  title="Remove link"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleAddLink} className="flex gap-2">
          <Input
            type="url"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            required
            className="max-w-sm"
          />
          <Button type="submit" variant="outline" disabled={addingLink}>
            {addingLink ? "Adding..." : "Add Link"}
          </Button>
        </form>
      </section>
    </>
  );
}
