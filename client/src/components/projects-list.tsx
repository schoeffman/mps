import { Link } from "react-router-dom";
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

interface Project {
  id: number;
  name: string;
  targetDate: string;
  dri: { id: number; fullName: string };
  status: string;
  color: string;
  projectType: string;
  createdAt: string;
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  Explore: "outline",
  Make: "default",
  Complete: "secondary",
};

export function ProjectsList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p>No projects yet.</p>
        <p className="text-sm">Click "Add Project" to create one.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>DRI</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Target Date</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[80px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {projects.map((project) => (
          <TableRow key={project.id}>
            <TableCell className="font-medium">
              <Link to={`/projects/${project.id}`} className="hover:underline">
                {project.name}
              </Link>
            </TableCell>
            <TableCell>{project.dri.fullName}</TableCell>
            <TableCell>
              <Badge variant="secondary">
                {project.projectType === "FeatureDevelopment" ? "Feature Development" : "Maintenance"}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={statusVariant[project.status] ?? "outline"}>
                {project.status}
              </Badge>
            </TableCell>
            <TableCell>{new Date(project.targetDate).toLocaleDateString()}</TableCell>
            <TableCell>{new Date(project.createdAt).toLocaleDateString()}</TableCell>
            <TableCell className="flex gap-1">
              <EditProjectDialog project={project} />
              <DeleteProjectButton projectId={project.id} projectName={project.name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
