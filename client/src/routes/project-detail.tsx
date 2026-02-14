import { useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import { GET_PROJECTS } from "@/routes/projects";
import { ArrowLeft, Trash2, X, ExternalLink, ArrowUp, ArrowDown } from "lucide-react";
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
      jiraProjectKey
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

const JIRA_CONFIG_FOR_PROJECT = gql`
  query JiraConfigForProject {
    jiraConfig {
      id
      domain
    }
  }
`;

const GET_JIRA_ISSUES = gql`
  query GetJiraIssues($projectId: Int!) {
    jiraIssues(projectId: $projectId) {
      key
      summary
      status
      statusColor
      assignee
    }
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
  const [jiraColWidths, setJiraColWidths] = useState<number[] | null>(null);
  const [jiraSortCol, setJiraSortCol] = useState<string>("key");
  const [jiraSortAsc, setJiraSortAsc] = useState(true);
  const resizeRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  const colRatios = [0.15, 0.50, 0.175, 0.175];

  const jiraTableRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || jiraColWidths) return;
    const width = node.clientWidth;
    setJiraColWidths(colRatios.map(r => Math.floor(r * width)));
  }, [jiraColWidths]);

  const onResizeStart = useCallback((colIndex: number, e: React.MouseEvent) => {
    if (!jiraColWidths) return;
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = jiraColWidths[colIndex];
    resizeRef.current = { colIndex, startX, startWidth };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = ev.clientX - resizeRef.current.startX;
      const newWidth = Math.max(60, resizeRef.current.startWidth + diff);
      setJiraColWidths(prev => {
        const next = [...prev];
        next[resizeRef.current!.colIndex] = newWidth;
        return next;
      });
    };

    const onMouseUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [jiraColWidths]);

  const hasJiraKey = data?.project?.jiraProjectKey;
  const { data: jiraConfigData } = useQuery(JIRA_CONFIG_FOR_PROJECT, { skip: !hasJiraKey });
  const { data: jiraIssuesData, loading: jiraLoading, error: jiraError } = useQuery(GET_JIRA_ISSUES, {
    variables: { projectId },
    skip: !hasJiraKey,
  });

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
                            <Link to={`/users/${assignment.user.id}`} className="hover:underline">
                              {assignment.user.fullName}
                            </Link>
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

      {/* Jira Issues Section */}
      {project.jiraProjectKey && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold mb-2">Jira Issues</h2>
          {jiraIssuesData?.jiraIssues?.length > 0 && (() => {
            const counts: Record<string, { count: number; color: string }> = {};
            for (const issue of jiraIssuesData.jiraIssues) {
              if (!counts[issue.status]) {
                counts[issue.status] = { count: 0, color: jiraStatusColor(issue.statusColor, issue.status) };
              }
              counts[issue.status].count++;
            }
            const total = jiraIssuesData.jiraIssues.length;
            const entries = Object.entries(counts).sort((a, b) => b[1].count - a[1].count);
            return (
              <div className="mb-4">
                <div className="flex h-5 w-full rounded overflow-hidden">
                  {entries.map(([status, { count, color }]) => (
                    <div
                      key={status}
                      style={{ width: `${(count / total) * 100}%`, backgroundColor: color }}
                      title={`${status}: ${count} (${Math.round((count / total) * 100)}%)`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  {entries.map(([status, { count, color }]) => (
                    <span key={status} className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                      {status} ({count})
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
          {jiraLoading ? (
            <p className="text-sm text-muted-foreground">Loading Jira issues...</p>
          ) : jiraError ? (
            <p className="text-sm text-destructive">Failed to load Jira issues: {jiraError.message}</p>
          ) : jiraIssuesData?.jiraIssues?.length > 0 ? (
            <div className="overflow-x-auto" ref={jiraTableRef}>
            {jiraColWidths && (
            <Table style={{ tableLayout: "fixed", width: jiraColWidths.reduce((a, b) => a + b, 0) }}>
              <TableHeader>
                <TableRow>
                  {[{ label: "Key", field: "key" }, { label: "Title", field: "summary" }, { label: "Status", field: "status" }, { label: "Assignee", field: "assignee" }].map((col, i) => (
                    <TableHead
                      key={col.field}
                      style={{ width: jiraColWidths![i], position: "relative", cursor: "pointer", userSelect: "none" }}
                      onClick={() => {
                        if (jiraSortCol === col.field) {
                          setJiraSortAsc(prev => !prev);
                        } else {
                          setJiraSortCol(col.field);
                          setJiraSortAsc(true);
                        }
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {jiraSortCol === col.field && (
                          jiraSortAsc ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
                        )}
                      </span>
                      <div
                        onMouseDown={(e) => { e.stopPropagation(); onResizeStart(i, e); }}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: 6,
                          cursor: "col-resize",
                          userSelect: "none",
                        }}
                        className="hover:bg-border"
                      />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...jiraIssuesData.jiraIssues]
                  .sort((a: Record<string, string | null>, b: Record<string, string | null>) => {
                    const av = (a[jiraSortCol] ?? "").toLowerCase();
                    const bv = (b[jiraSortCol] ?? "").toLowerCase();
                    if (av < bv) return jiraSortAsc ? -1 : 1;
                    if (av > bv) return jiraSortAsc ? 1 : -1;
                    return 0;
                  })
                  .map((issue: { key: string; summary: string; status: string; statusColor: string; assignee: string | null }) => (
                  <TableRow key={issue.key}>
                    <TableCell className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                      {jiraConfigData?.jiraConfig?.domain ? (
                        <a
                          href={`https://${jiraConfigData.jiraConfig.domain}.atlassian.net/browse/${issue.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {issue.key}
                        </a>
                      ) : (
                        issue.key
                      )}
                    </TableCell>
                    <TableCell className="overflow-hidden text-ellipsis whitespace-nowrap">
                      {jiraConfigData?.jiraConfig?.domain ? (
                        <a
                          href={`https://${jiraConfigData.jiraConfig.domain}.atlassian.net/browse/${issue.key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {issue.summary}
                        </a>
                      ) : (
                        issue.summary
                      )}
                    </TableCell>
                    <TableCell className="overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: jiraStatusColor(issue.statusColor, issue.status) }}
                        />
                        {issue.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap">{issue.assignee ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No issues found.</p>
          )}
        </section>
      )}
    </>
  );
}

function jiraStatusColor(colorName: string, statusName?: string): string {
  const statusOverrides: Record<string, string> = {
    cancelled: "#c1c7d0",
  };
  if (statusName && statusOverrides[statusName.toLowerCase()]) {
    return statusOverrides[statusName.toLowerCase()];
  }
  const colors: Record<string, string> = {
    "blue-gray": "#6b778c",
    blue: "#2684ff",
    yellow: "#ffab00",
    green: "#36b37e",
    "medium-gray": "#c1c7d0",
  };
  return colors[colorName] ?? "#6b778c";
}
