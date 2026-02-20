import { Link } from "react-router-dom";
import { useMutation, gql } from "@apollo/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteProjectButton } from "@/components/delete-project-button";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { PROJECT_COLOR_OPTIONS } from "@/lib/project-colors";
import { GET_PROJECTS } from "@/routes/projects";

const UPDATE_PROJECT_COLOR = gql`
  mutation UpdateProjectColor($id: Int!, $color: String!) {
    updateProjectColor(id: $id, color: $color) {
      id
      color
    }
  }
`;

interface Project {
  id: number;
  name: string;
  targetDate: string;
  dri: { id: number; fullName: string } | null;
  status: string;
  color: string;
  projectType: string;
  isSystem: boolean;
  jiraProjectKey: string | null;
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  Explore: "outline",
  Make: "default",
  Complete: "secondary",
  Cancelled: "secondary",
  Paused: "outline",
};

export function ProjectsList({ projects }: { projects: Project[] }) {
  const regularProjects = projects.filter((p) => !p.isSystem);
  const systemProjects = projects.filter((p) => p.isSystem).sort((a, b) => a.id - b.id);

  return (
    <>
      {regularProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <p>No projects yet.</p>
          <p className="text-sm">Click "Add Project" to create one.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>DRI</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Target Date</TableHead>
              <TableHead>Project Key</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {regularProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  <Link to={`/projects/${project.id}`} className="hover:underline">
                    {project.name}
                  </Link>
                </TableCell>
                <TableCell>{project.dri?.fullName ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {project.projectType === "FeatureDevelopment" ? "Feature Development" : project.projectType === "Maintenance" ? "Maintenance" : "Other"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[project.status] ?? "outline"}>
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell>{new Date(project.targetDate).toLocaleDateString()}</TableCell>
                <TableCell className="text-muted-foreground">{project.jiraProjectKey ?? "—"}</TableCell>
                <TableCell className="flex gap-1">
                  <EditProjectDialog project={project} />
                  <DeleteProjectButton projectId={project.id} projectName={project.name} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {systemProjects.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-8 mb-2">Static Projects</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Color</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemProjects.map((project) => (
                <SystemProjectRow key={project.id} project={project} />
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </>
  );
}

function SystemProjectRow({ project }: { project: Project }) {
  const [updateColor] = useMutation(UPDATE_PROJECT_COLOR, {
    refetchQueries: [{ query: GET_PROJECTS }, "GetScheduleDetail"],
  });

  return (
    <TableRow>
      <TableCell className="font-medium">{project.name}</TableCell>
      <TableCell>
        <Badge variant="secondary">
          {project.projectType === "FeatureDevelopment" ? "Feature Development" : project.projectType === "Maintenance" ? "Maintenance" : "Other"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex gap-1.5 flex-wrap">
          {PROJECT_COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              title={opt.label}
              onClick={() => updateColor({ variables: { id: project.id, color: opt.key } })}
              className={`w-6 h-6 rounded-md border-2 transition-all cursor-pointer ${opt.chipBg} ${
                project.color === opt.key ? "ring-2 ring-primary ring-offset-1 scale-110" : "opacity-50 hover:opacity-100"
              }`}
            />
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
}
