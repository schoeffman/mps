import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import { GET_PROJECTS } from "@/routes/projects";
import { ArrowLeft, Trash2, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
      members {
        id
        fullName
        craftAbility
        jobLevel
        craftFocus
      }
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

const enumLabels: Record<string, string> = {
  ProductManagement: "Product Management",
  DataScience: "Data Science",
  NotApplicable: "Not Applicable",
  FeatureDevelopment: "Feature Development",
};

function formatEnum(value: string) {
  return enumLabels[value] ?? value;
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

      <h2 className="text-lg font-semibold mb-2">Team Members</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Craft Ability</TableHead>
            <TableHead>Job Level</TableHead>
            <TableHead>Craft Focus</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {project.members.map((member: { id: number; fullName: string; craftAbility: string; jobLevel: string; craftFocus: string }) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">{member.fullName}</TableCell>
              <TableCell>{formatEnum(member.craftAbility)}</TableCell>
              <TableCell>{member.jobLevel}</TableCell>
              <TableCell>{formatEnum(member.craftFocus)}</TableCell>
              <TableCell>
                {member.id === project.dri.id ? (
                  <Badge>DRI</Badge>
                ) : (
                  <Badge variant="secondary">Member</Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

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
