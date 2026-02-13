import { useState, useMemo, createContext, useContext } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getProjectColor } from "@/lib/project-colors";
import { EditWorkHistoryDialog } from "@/components/edit-work-history-dialog";
import { GET_USERS } from "@/routes/users";
import { GET_PROJECTS } from "@/routes/projects";

const GET_WORK_HISTORY = gql`
  query GetWorkHistory($date: String!) {
    workHistory(date: $date) {
      id
      date
      user {
        id
        fullName
      }
      project {
        id
        name
        color
      }
      scheduleName
    }
  }
`;

const GET_WORK_HISTORY_ADJACENT = gql`
  query GetWorkHistoryAdjacentDates($date: String!) {
    workHistoryAdjacentDates(date: $date) {
      previous
      next
    }
  }
`;

const GET_WORK_HISTORY_DATES = gql`
  query GetWorkHistoryDates($startDate: String!, $endDate: String!) {
    workHistoryDates(startDate: $startDate, endDate: $endDate)
  }
`;

const ADD_WORK_HISTORY_ENTRIES = gql`
  mutation AddWorkHistoryEntries($userId: Int!, $projectId: Int!, $startDate: String!, $endDate: String!) {
    addWorkHistoryEntries(userId: $userId, projectId: $projectId, startDate: $startDate, endDate: $endDate) {
      id
      date
      user {
        id
        fullName
      }
      project {
        id
        name
        color
      }
      scheduleName
    }
  }
`;

const DELETE_WORK_HISTORY_ENTRY = gql`
  mutation DeleteWorkHistoryEntry($id: Int!) {
    deleteWorkHistoryEntry(id: $id)
  }
`;

function toISO(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("default", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getMonthRange(month: Date) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { startDate: toISO(start), endDate: toISO(end) };
}

const DatesWithDataCtx = createContext<{
  dates: Set<string>;
  loaded: boolean;
}>({ dates: new Set(), loaded: false });

function DayButtonWithTooltip(
  props: React.ComponentProps<typeof CalendarDayButton>,
) {
  const { dates, loaded } = useContext(DatesWithDataCtx);
  const iso = toISO(props.day.date);
  const showNoData = loaded && !props.modifiers.outside && !dates.has(iso);

  if (!showNoData) {
    return <CalendarDayButton {...props} />;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex size-full items-center justify-center">
          <CalendarDayButton {...props} />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top">No data for this day</TooltipContent>
    </Tooltip>
  );
}

export default function WorkHistory() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [month, setMonth] = useState(new Date());

  const { startDate, endDate } = getMonthRange(month);
  const { data: datesData, loading: datesLoading } = useQuery(
    GET_WORK_HISTORY_DATES,
    { variables: { startDate, endDate } },
  );

  const datesCtx = useMemo(
    () => ({
      dates: new Set<string>(datesData?.workHistoryDates ?? []),
      loaded: !datesLoading,
    }),
    [datesData, datesLoading],
  );

  const calendarValue = selectedDate
    ? new Date(selectedDate + "T00:00:00")
    : undefined;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Work History</h1>
        {!selectedDate && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Update Work History</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Work History</DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <AddWorkHistoryForm />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {selectedDate ? (
        <DayDetail
          date={selectedDate}
          onBack={() => setSelectedDate(null)}
          onNavigate={setSelectedDate}
        />
      ) : (
        <div className="mt-4 flex justify-center">
          <DatesWithDataCtx.Provider value={datesCtx}>
            <TooltipProvider>
              <Calendar
                mode="single"
                selected={calendarValue}
                onSelect={(date) => {
                  if (!date) return;
                  const iso = toISO(date);
                  if (!datesCtx.loaded || datesCtx.dates.has(iso)) {
                    setSelectedDate(iso);
                  }
                }}
                month={month}
                onMonthChange={setMonth}
                modifiers={{
                  noData: (date) => {
                    if (!datesCtx.loaded) return false;
                    return !datesCtx.dates.has(toISO(date));
                  },
                }}
                modifiersClassNames={{
                  noData: "opacity-35",
                }}
                className="rounded-md border shadow-xs"
                classNames={{
                  day: "relative w-full h-full p-0 text-center group/day aspect-square select-none [--cell-size:--spacing(12)]",
                }}
                components={{
                  DayButton: DayButtonWithTooltip,
                }}
              />
            </TooltipProvider>
          </DatesWithDataCtx.Provider>
        </div>
      )}
    </>
  );
}

function AddWorkHistoryForm({ defaultDate }: { defaultDate?: string }) {
  const yesterday = toISO(new Date(Date.now() - 86400000));
  const initial = defaultDate && defaultDate <= yesterday ? defaultDate : yesterday;

  const [addUserId, setAddUserId] = useState<string>("");
  const [addProjectId, setAddProjectId] = useState<string>("");
  const [addStartDate, setAddStartDate] = useState(initial);
  const [addEndDate, setAddEndDate] = useState(initial);

  const { data: usersData } = useQuery(GET_USERS);
  const { data: projectsData } = useQuery(GET_PROJECTS);
  const [addEntries, { loading: adding }] = useMutation(ADD_WORK_HISTORY_ENTRIES, {
    refetchQueries: ["GetWorkHistory", "GetWorkHistoryDates", "GetWorkHistoryAdjacentDates"],
  });

  const allUsers: { id: number; fullName: string }[] = usersData?.users ?? [];
  const allProjects: { id: number; name: string }[] = projectsData?.projects ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addUserId || !addProjectId || !addStartDate || !addEndDate) return;
    await addEntries({
      variables: { userId: Number(addUserId), projectId: Number(addProjectId), startDate: addStartDate, endDate: addEndDate },
    });
    setAddUserId("");
    setAddProjectId("");
    setAddStartDate(initial);
    setAddEndDate(initial);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3 flex-wrap">
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">User</label>
        <Select value={addUserId} onValueChange={setAddUserId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select user" />
          </SelectTrigger>
          <SelectContent>
            {allUsers.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">Project</label>
        <Select value={addProjectId} onValueChange={setAddProjectId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {allProjects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">Start Date</label>
        <Input
          type="date"
          value={addStartDate}
          onChange={(e) => setAddStartDate(e.target.value)}
          max={addEndDate}
          className="w-[160px]"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <label className="text-sm font-medium">End Date</label>
        <Input
          type="date"
          value={addEndDate}
          onChange={(e) => setAddEndDate(e.target.value)}
          min={addStartDate}
          max={yesterday}
          className="w-[160px]"
          required
        />
      </div>
      <Button type="submit" variant="outline" disabled={adding || !addUserId || !addProjectId || !addStartDate || !addEndDate}>
        {adding ? "Adding..." : "Add Entries"}
      </Button>
    </form>
  );
}

function DayDetail({
  date,
  onBack,
  onNavigate,
}: {
  date: string;
  onBack: () => void;
  onNavigate: (date: string) => void;
}) {
  const { loading, error, data } = useQuery(GET_WORK_HISTORY, {
    variables: { date },
  });
  const { data: adjData } = useQuery(GET_WORK_HISTORY_ADJACENT, {
    variables: { date },
  });
  const [deleteEntry] = useMutation(DELETE_WORK_HISTORY_ENTRY, {
    refetchQueries: ["GetWorkHistory", "GetWorkHistoryDates", "GetWorkHistoryAdjacentDates"],
  });

  const entries = data?.workHistory ?? [];
  const prevDate = adjData?.workHistoryAdjacentDates?.previous ?? null;
  const nextDate = adjData?.workHistoryAdjacentDates?.next ?? null;

  return (
    <div className="mt-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-3 -ml-2"
      >
        <ArrowLeft className="size-4 mr-1" />
        Back to calendar
      </Button>

      <div className="flex items-center gap-2 mb-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={!prevDate}
                  onClick={() => prevDate && onNavigate(prevDate)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {prevDate
                ? `Go to ${formatDisplayDate(prevDate)}`
                : "No earlier data available"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <h2 className="text-lg font-medium">{formatDisplayDate(date)}</h2>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  disabled={!nextDate}
                  onClick={() => nextDate && onNavigate(nextDate)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              {nextDate
                ? `Go to ${formatDisplayDate(nextDate)}`
                : "No later data available"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-muted-foreground">
          No work history recorded for this date.
        </p>
      )}

      {entries.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left font-medium">User</th>
                <th className="px-4 py-2 text-left font-medium">Project</th>
                <th className="px-4 py-2 text-left font-medium">Schedule</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry: any) => {
                const color = getProjectColor(entry.project.color);
                return (
                  <tr key={entry.id} className="border-b last:border-b-0">
                    <td className="px-4 py-2">{entry.user.fullName}</td>
                    <td className="px-4 py-2">
                      <Link to={`/projects/${entry.project.id}`}>
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium hover:opacity-80 transition-opacity ${color.chipBg}`}
                        >
                          {entry.project.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {entry.scheduleName}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <EditWorkHistoryDialog entry={entry} />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => deleteEntry({ variables: { id: entry.id } })}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <AddWorkHistoryForm defaultDate={date} />
      </div>
    </div>
  );
}
