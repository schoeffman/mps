import { useState, useCallback, useRef, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useLazyQuery, useMutation, gql } from "@apollo/client";
import { GET_PROJECTS } from "@/routes/projects";
import { ArrowLeft, Trash2, X, ExternalLink, ArrowUp, ArrowDown, RefreshCw, Loader2, BarChart3 } from "lucide-react";
import { GanttChart, type GanttTask } from "@/components/gantt-chart";
import { scheduleIssues, type JiraIssue, type Assignment } from "@/lib/gantt-scheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { AdfRenderer } from "@/components/adf-renderer";
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
      description
      status
      statusColor
      assignee
      storyPoints
    }
  }
`;

const GET_JIRA_TRANSITIONS = gql`
  query GetJiraTransitions($issueKey: String!) {
    jiraTransitions(issueKey: $issueKey) {
      id
      name
    }
  }
`;

const TRANSITION_JIRA_ISSUE = gql`
  mutation TransitionJiraIssue($issueKey: String!, $transitionId: String!) {
    transitionJiraIssue(issueKey: $issueKey, transitionId: $transitionId)
  }
`;

const SEARCH_JIRA_USERS = gql`
  query SearchJiraUsers($query: String!) {
    searchJiraUsers(query: $query) {
      accountId
      displayName
      emailAddress
    }
  }
`;

const ASSIGN_JIRA_ISSUE = gql`
  mutation AssignJiraIssue($issueKey: String!, $accountId: String) {
    assignJiraIssue(issueKey: $issueKey, accountId: $accountId)
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

const PROJECT_CHECKLIST = gql`
  query ProjectChecklist($projectId: Int!) {
    projectChecklist(projectId: $projectId) {
      key
      phase
      description
      completed
      skipped
      completedBy
      completedAt
    }
  }
`;

const TOGGLE_CHECKLIST_ITEM = gql`
  mutation ToggleProjectChecklistItem($projectId: Int!, $itemKey: String!) {
    toggleProjectChecklistItem(projectId: $projectId, itemKey: $itemKey)
  }
`;

const SKIP_CHECKLIST_ITEM = gql`
  mutation SkipProjectChecklistItem($projectId: Int!, $itemKey: String!) {
    skipProjectChecklistItem(projectId: $projectId, itemKey: $itemKey)
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

  const { data: checklistData } = useQuery(PROJECT_CHECKLIST, {
    variables: { projectId },
  });
  const [toggleChecklistItem] = useMutation(TOGGLE_CHECKLIST_ITEM, {
    refetchQueries: [{ query: PROJECT_CHECKLIST, variables: { projectId } }],
  });
  const [skipChecklistItem] = useMutation(SKIP_CHECKLIST_ITEM, {
    refetchQueries: [{ query: PROJECT_CHECKLIST, variables: { projectId } }],
  });

  const [linkUrl, setLinkUrl] = useState("");
  const [jiraRefreshing, setJiraRefreshing] = useState(false);
  const [jiraLastSynced, setJiraLastSynced] = useState<Date | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<{ key: string; summary: string; status: string; statusColor: string; assignee: string | null; storyPoints: number | null } | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [jiraColWidths, setJiraColWidths] = useState<number[] | null>(null);
  const [jiraSortCol, setJiraSortCol] = useState<string>("status");
  const [jiraSortAsc, setJiraSortAsc] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const resizeRef = useRef<{ colIndex: number; startX: number; startWidth: number } | null>(null);
  const colRatios = [0.12, 0.46, 0.15, 0.15, 0.07];

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
  const { data: jiraConfigData, loading: jiraConfigLoading } = useQuery(JIRA_CONFIG_FOR_PROJECT);
  const { data: jiraIssuesData, loading: jiraLoading, error: jiraError, refetch: refetchJiraIssues } = useQuery(GET_JIRA_ISSUES, {
    variables: { projectId },
    skip: !hasJiraKey,
    fetchPolicy: "cache-and-network",
    nextFetchPolicy: "cache-first",
    pollInterval: 300000,
    onCompleted: () => setJiraLastSynced(new Date()),
  });

  const { data: transitionsData, loading: transitionsLoading } = useQuery(GET_JIRA_TRANSITIONS, {
    variables: { issueKey: selectedIssue?.key ?? "" },
    skip: !selectedIssue,
    fetchPolicy: "network-only",
  });

  const [transitionJiraIssue] = useMutation(TRANSITION_JIRA_ISSUE);
  const [searchUsers, { data: usersData, loading: usersLoading }] = useLazyQuery(SEARCH_JIRA_USERS, { fetchPolicy: "network-only" });
  const [assignJiraIssue] = useMutation(ASSIGN_JIRA_ISSUE);

  async function handleAssign(accountId: string | null) {
    if (!selectedIssue) return;
    setAssigning(true);
    try {
      await assignJiraIssue({ variables: { issueKey: selectedIssue.key, accountId } });
      const { data: refreshed } = await refetchJiraIssues();
      const updated = refreshed?.jiraIssues?.find((i: { key: string }) => i.key === selectedIssue.key);
      if (updated) setSelectedIssue(updated);
      setAssigneeSearch("");
    } catch (err) {
      console.error("Assign failed:", err);
    } finally {
      setAssigning(false);
    }
  }

  async function handleTransition(transitionId: string) {
    if (!selectedIssue) return;
    setTransitioning(true);
    try {
      await transitionJiraIssue({ variables: { issueKey: selectedIssue.key, transitionId } });
      const { data: refreshed } = await refetchJiraIssues();
      const updated = refreshed?.jiraIssues?.find((i: { key: string }) => i.key === selectedIssue.key);
      if (updated) setSelectedIssue(updated);
    } catch (err) {
      console.error("Transition failed:", err);
    } finally {
      setTransitioning(false);
    }
  }

  const ganttResult = useMemo(() => {
    if (!showGantt || !jiraIssuesData?.jiraIssues || !assignmentsData?.projectAssignments) return null;
    return scheduleIssues(
      jiraIssuesData.jiraIssues as JiraIssue[],
      assignmentsData.projectAssignments as Assignment[],
      new Date()
    );
  }, [showGantt, jiraIssuesData, assignmentsData]);

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

      {/* Checklist Section */}
      {checklistData?.projectChecklist && (() => {
        const items = checklistData.projectChecklist as { key: string; phase: string; description: string; completed: boolean; skipped: boolean; completedBy: string | null; completedAt: string | null }[];
        const doneCount = items.filter((i) => i.completed || i.skipped).length;
        const phases = ["Wonder", "Explore", "Make"];
        return (
          <section className="mt-6">
            <details>
              <summary className="cursor-pointer select-none">
                <span className="inline-flex items-center gap-2">
                  <span className="text-lg font-semibold">Project Checklist</span>
                  <span className="text-sm text-muted-foreground">({doneCount}/{items.length} · {Math.round((doneCount / items.length) * 100)}%)</span>
                </span>
              </summary>
              <div className="mt-3">
                {phases.map((phase) => {
                  const phaseItems = items.filter((i) => i.phase === phase);
                  const donePhaseCount = phaseItems.filter((i) => i.completed || i.skipped).length;
                  return (
                    <div key={phase} className="mb-4">
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">
                        {phase} ({donePhaseCount}/{phaseItems.length})
                      </h3>
                      <div className="space-y-2">
                        {phaseItems.map((item) => (
                          <div
                            key={item.key}
                            className="flex items-start gap-2"
                          >
                            <div className="flex shrink-0 gap-1">
                              <Button
                                variant={item.completed ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => toggleChecklistItem({ variables: { projectId, itemKey: item.key } })}
                              >
                                {item.completed ? "Undo" : "Complete"}
                              </Button>
                              <Button
                                variant={item.skipped ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => skipChecklistItem({ variables: { projectId, itemKey: item.key } })}
                              >
                                {item.skipped ? "Undo" : "Skip"}
                              </Button>
                            </div>
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className={item.completed || item.skipped ? "line-through text-muted-foreground" : "text-sm"}>
                                {item.description}
                                {item.skipped && <span className="ml-1.5 text-xs italic">(skipped)</span>}
                              </span>
                              {(item.completed || item.skipped) && item.completedBy && (
                                <span className="text-xs text-muted-foreground">
                                  {item.skipped ? "Skipped" : "Completed"} by {item.completedBy} on {new Date(item.completedAt + "T00:00:00").toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          </section>
        );
      })()}

      {/* Jira Issues Section */}
        <section className="mt-6">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-lg font-semibold">Jira Issues</h2>
            {hasJiraKey && jiraIssuesData?.jiraIssues && (
              <span className="text-sm text-muted-foreground">({jiraIssuesData.jiraIssues.length})</span>
            )}
            {hasJiraKey && (
              <>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={jiraRefreshing}
                  onClick={async () => {
                    setJiraRefreshing(true);
                    try {
                      await refetchJiraIssues();
                      setJiraLastSynced(new Date());
                    } finally {
                      setJiraRefreshing(false);
                    }
                  }}
                  title="Refresh Jira issues"
                >
                  <RefreshCw className={jiraRefreshing ? "animate-spin" : ""} />
                </Button>
                {jiraLastSynced && (
                  <span className="text-xs text-muted-foreground">
                    Synced {jiraLastSynced.toLocaleTimeString()}
                  </span>
                )}
              </>
            )}
            {hasJiraKey && jiraIssuesData?.jiraIssues?.length > 0 && assignmentsData?.projectAssignments?.length > 0 && (
              <Button
                variant={showGantt ? "outline" : "default"}
                size="sm"
                className="ml-auto"
                onClick={() => setShowGantt((v) => !v)}
              >
                <BarChart3 className="size-4 mr-1.5" />
                {showGantt ? "Hide Gantt" : "Generate Gantt"}
              </Button>
            )}
          </div>
          {showGantt && ganttResult && (
            <div className="mb-4">
              {ganttResult.scheduled.length > 0 ? (
                <>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-muted-foreground">
                    {(() => {
                      const palette = ["#2684ff", "#36b37e", "#ffab00", "#ff5630", "#6554c0", "#00b8d9", "#ff8b00", "#6b778c"];
                      const seen = new Map<string, string>();
                      ganttResult.scheduled.forEach((t) => {
                        if (!seen.has(t.assignee)) seen.set(t.assignee, t.type);
                      });
                      return Array.from(seen.entries()).map(([name, type]) => {
                        const idx = parseInt(type.replace("assignee-", ""), 10) || 0;
                        return (
                          <span key={name} className="inline-flex items-center gap-1.5">
                            <span className="size-2 rounded-full" style={{ backgroundColor: palette[idx % palette.length] }} />
                            {name}
                          </span>
                        );
                      });
                    })()}
                  </div>
                  <GanttChart
                    tasks={ganttResult.scheduled as GanttTask[]}
                    onTaskClick={(taskId) => {
                      const issue = jiraIssuesData?.jiraIssues?.find(
                        (i: { key: string }) => i.key === taskId
                      );
                      if (issue) setSelectedIssue(issue);
                    }}
                  />
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No issues could be scheduled — team members may not have date ranges assigned.</p>
              )}
              {ganttResult.unscheduled.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    Unscheduled ({ganttResult.unscheduled.length} issues — not enough team capacity):
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-0.5">
                    {ganttResult.unscheduled.map((issue) => (
                      <li key={issue.key}>{issue.key}: {issue.summary}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {!jiraConfigLoading && !jiraConfigData?.jiraConfig ? (
            <p className="text-sm text-muted-foreground">
              Jira integration is not configured. Set it up in{" "}
              <Link to="/settings" className="text-primary hover:underline">Settings</Link>{" "}
              to link Jira issues to your projects.
            </p>
          ) : !project.jiraProjectKey ? (
            <p className="text-sm text-muted-foreground">
              No Jira epic key linked to this project. Click the edit button above to add a Jira project or epic key.
            </p>
          ) : (
          <>
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
          {jiraIssuesData?.jiraIssues?.length > 0 && (() => {
            const doneIssues = jiraIssuesData.jiraIssues.filter(
              (issue: { statusColor: string }) => issue.statusColor === "green"
            );
            if (doneIssues.length === 0) return null;
            const counts: Record<string, number> = {};
            for (const issue of doneIssues) {
              const name = (issue as { assignee: string | null }).assignee ?? "Unassigned";
              counts[name] = (counts[name] ?? 0) + 1;
            }
            const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            const total = doneIssues.length;
            const palette = ["#2684ff", "#36b37e", "#ffab00", "#ff5630", "#6554c0", "#00b8d9", "#ff8b00", "#6b778c"];
            return (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-1">Done by assignee</p>
                <div className="flex h-5 w-full rounded overflow-hidden">
                  {entries.map(([name, count], i) => (
                    <div
                      key={name}
                      style={{ width: `${(count / total) * 100}%`, backgroundColor: palette[i % palette.length] }}
                      title={`${name}: ${count} (${Math.round((count / total) * 100)}%)`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                  {entries.map(([name, count], i) => (
                    <span key={name} className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: palette[i % palette.length] }} />
                      {name} ({count})
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}
          <details>
            <summary className="cursor-pointer select-none text-sm text-muted-foreground mb-2">Show issues</summary>
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
                  {[{ label: "Key", field: "key" }, { label: "Title", field: "summary" }, { label: "Status", field: "status" }, { label: "Assignee", field: "assignee" }, { label: "SP", field: "storyPoints" }].map((col, i) => (
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
                  .sort((a: Record<string, string | number | null>, b: Record<string, string | number | null>) => {
                    if (jiraSortCol === "storyPoints") {
                      const av = (a[jiraSortCol] as number | null) ?? -1;
                      const bv = (b[jiraSortCol] as number | null) ?? -1;
                      return jiraSortAsc ? av - bv : bv - av;
                    }
                    const av = (String(a[jiraSortCol] ?? "")).toLowerCase();
                    const bv = (String(b[jiraSortCol] ?? "")).toLowerCase();
                    if (av < bv) return jiraSortAsc ? -1 : 1;
                    if (av > bv) return jiraSortAsc ? 1 : -1;
                    return 0;
                  })
                  .map((issue: { key: string; summary: string; status: string; statusColor: string; assignee: string | null; storyPoints: number | null }) => (
                  <TableRow key={issue.key}>
                    <TableCell className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        {jiraConfigData?.jiraConfig?.domain && (
                          <a
                            href={`https://${jiraConfigData.jiraConfig.domain}.atlassian.net/browse/${issue.key}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="size-3.5" />
                          </a>
                        )}
                        <span
                          className="cursor-pointer hover:underline"
                          onClick={() => setSelectedIssue(issue)}
                        >
                          {issue.key}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="overflow-hidden text-ellipsis whitespace-nowrap">
                      <span
                        className="cursor-pointer hover:underline"
                        onClick={() => setSelectedIssue(issue)}
                      >
                        {issue.summary}
                      </span>
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
                    <TableCell className="text-muted-foreground text-center overflow-hidden text-ellipsis whitespace-nowrap">{issue.storyPoints ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No issues found.</p>
          )}
          </details>
          </>
          )}
        </section>

      {/* Jira Issue Detail Panel */}
      <Sheet open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="pr-8">{selectedIssue?.summary}</SheetTitle>
            <SheetDescription className="sr-only">Jira issue details</SheetDescription>
              {jiraConfigData?.jiraConfig?.domain && selectedIssue && (
                <a
                  href={`https://${jiraConfigData.jiraConfig.domain}.atlassian.net/browse/${selectedIssue.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" />
                  {selectedIssue.key}
                </a>
              )}
          </SheetHeader>
          {selectedIssue && (
            <div className="px-4 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <span className="inline-flex items-center gap-1.5 text-sm">
                  {transitioning ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: jiraStatusColor(selectedIssue.statusColor, selectedIssue.status) }}
                    />
                  )}
                  {transitioning ? "Updating..." : selectedIssue.status}
                </span>
              </div>
              {!transitionsLoading && transitionsData?.jiraTransitions?.length > 0 && (
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer select-none">Move to</summary>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {transitionsData.jiraTransitions.map((t: { id: string; name: string }) => (
                      <Button
                        key={t.id}
                        variant="outline"
                        size="sm"
                        disabled={transitioning}
                        onClick={() => handleTransition(t.id)}
                      >
                        {t.name}
                      </Button>
                    ))}
                  </div>
                </details>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Story Points</p>
                <p className="text-sm">{selectedIssue.storyPoints ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Assignee</p>
                <p className="text-sm">
                  {assigning ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="size-3 animate-spin" />
                      Updating...
                    </span>
                  ) : (
                    selectedIssue.assignee ?? "Unassigned"
                  )}
                </p>
                <details>
                  <summary className="text-xs text-muted-foreground cursor-pointer select-none mt-1">Choose new assignee</summary>
                  <Input
                    type="text"
                    placeholder="Search users..."
                    value={assigneeSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAssigneeSearch(val);
                      if (val.length >= 2) {
                        searchUsers({ variables: { query: val } });
                      }
                    }}
                    className="mt-2 h-8 text-sm"
                  />
                  {assigneeSearch.length >= 2 && (
                    <div className="mt-1 border rounded-md max-h-40 overflow-y-auto">
                      {usersLoading ? (
                        <p className="text-xs text-muted-foreground p-2">Searching...</p>
                      ) : usersData?.searchJiraUsers?.length > 0 ? (
                        usersData.searchJiraUsers.map((u: { accountId: string; displayName: string; emailAddress: string | null }) => (
                          <button
                            key={u.accountId}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                            disabled={assigning}
                            onClick={() => handleAssign(u.accountId)}
                          >
                            <span>{u.displayName}</span>
                            {u.emailAddress && (
                              <span className="text-xs text-muted-foreground ml-2">{u.emailAddress}</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground p-2">No users found</p>
                      )}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    disabled={!selectedIssue.assignee || assigning}
                    onClick={() => handleAssign(null)}
                  >
                    Unassign
                  </Button>
                </details>
              </div>
              {selectedIssue.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <AdfRenderer document={selectedIssue.description} />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
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
