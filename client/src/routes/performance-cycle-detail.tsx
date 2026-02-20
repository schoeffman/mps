import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, gql } from "@apollo/client";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ArrowLeft, Trash2, Check } from "lucide-react";
import { GET_PERFORMANCE_CYCLES } from "@/routes/performance-cycles";
import { Button } from "@/components/ui/button";
import { EditPerformanceCycleDialog } from "@/components/edit-performance-cycle-dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CycleUser {
  id: number;
  fullName: string;
  jobLevel: string;
  rating: string | null;
}

const RATINGS: { value: string | null; label: string; dotClass: string; textClass: string }[] = [
  { value: null,                     label: "Unrated",                  dotClass: "bg-gray-300",    textClass: "text-gray-400" },
  { value: "GreatlyExceeding",       label: "Greatly Exceeding",        dotClass: "bg-purple-500",  textClass: "text-purple-600" },
  { value: "Exceeding",              label: "Exceeding",                dotClass: "bg-green-500",   textClass: "text-green-600" },
  { value: "MetExpectations",        label: "Met Expectations",         dotClass: "bg-blue-500",    textClass: "text-blue-600" },
  { value: "MetMostExpectations",    label: "Met Most Expectations",    dotClass: "bg-amber-400",   textClass: "text-amber-500" },
  { value: "DidNotMeetExpectations", label: "Did Not Meet Expectations",dotClass: "bg-red-500",     textClass: "text-red-600" },
  { value: "NotEligible",            label: "Not Eligible",             dotClass: "bg-gray-400",    textClass: "text-gray-500" },
];

const UNRATED_KEY = "__unrated__";
function ratingToKey(r: string | null) { return r ?? UNRATED_KEY; }
function keyToRating(k: string): string | null { return k === UNRATED_KEY ? null : k; }
function ratingConfig(r: string | null) { return RATINGS.find((x) => x.value === r) ?? RATINGS[0]; }

const GET_PERFORMANCE_CYCLE = gql`
  query GetPerformanceCycle($id: Int!) {
    performanceCycle(id: $id) {
      id
      title
      cycleMonth
      users {
        id
        fullName
        jobLevel
        rating
      }
      createdAt
    }
  }
`;

const DELETE_PERFORMANCE_CYCLE = gql`
  mutation DeletePerformanceCycle($id: Int!) {
    deletePerformanceCycle(id: $id)
  }
`;

const REORDER_PERFORMANCE_CYCLE_USERS = gql`
  mutation ReorderPerformanceCycleUsers($cycleId: Int!, $userIds: [Int!]!) {
    reorderPerformanceCycleUsers(cycleId: $cycleId, userIds: $userIds)
  }
`;

const SET_RATING = gql`
  mutation SetPerformanceCycleMemberRating($cycleId: Int!, $userId: Int!, $rating: String) {
    setPerformanceCycleMemberRating(cycleId: $cycleId, userId: $userId, rating: $rating)
  }
`;

function formatCycleMonth(cycleMonth: string) {
  return new Date(cycleMonth + "-01").toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}


function RatingBar({ users }: { users: CycleUser[] }) {
  if (users.length === 0) return null;
  const total = users.length;
  const segments = RATINGS
    .map((r) => ({ ...r, count: users.filter((u) => u.rating === r.value).length }))
    .filter((r) => r.count > 0);

  return (
    <div className="mb-6">
      <div className="flex h-5 rounded-full overflow-hidden">
        {segments.map((seg) => (
          <div
            key={ratingToKey(seg.value)}
            className={seg.dotClass}
            style={{ width: `${(seg.count / total) * 100}%` }}
            title={`${seg.label}: ${seg.count} (${Math.round((seg.count / total) * 100)}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {segments.map((seg) => (
          <div key={ratingToKey(seg.value)} className="flex items-center gap-1.5 text-sm">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${seg.dotClass}`} />
            <span className={seg.textClass}>{seg.label}</span>
            <span className="text-muted-foreground">
              {seg.count} ({Math.round((seg.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RatingSelect({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (rating: string | null) => void;
}) {
  const cfg = ratingConfig(value);
  return (
    <Select value={ratingToKey(value)} onValueChange={(k) => onChange(keyToRating(k))}>
      <SelectTrigger className="w-52 gap-2">
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
        <span className={`truncate ${cfg.textClass}`}>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {RATINGS.map((r) => (
          <SelectItem key={ratingToKey(r.value)} value={ratingToKey(r.value)}>
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${r.dotClass}`} />
              <span className={r.textClass}>{r.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SortableUserRow({
  user,
  cycleId,
  onRatingChange,
}: {
  user: CycleUser;
  cycleId: number;
  onRatingChange: (userId: number, rating: string | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: user.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell className="w-8 px-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">
        <Link to={`/users/${user.id}`} className="hover:underline">
          {user.fullName}
        </Link>
      </TableCell>
      <TableCell>{user.jobLevel}</TableCell>
      <TableCell>
        <RatingSelect
          value={user.rating}
          onChange={(rating) => onRatingChange(user.id, rating)}
        />
      </TableCell>
    </TableRow>
  );
}

export default function PerformanceCycleDetail() {
  const { id } = useParams();
  const cycleId = Number(id);
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_PERFORMANCE_CYCLE, {
    variables: { id: cycleId },
  });
  const [users, setUsers] = useState<CycleUser[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.performanceCycle) setUsers(data.performanceCycle.users);
  }, [data]);

  const [deleteCycle] = useMutation(DELETE_PERFORMANCE_CYCLE, {
    refetchQueries: [{ query: GET_PERFORMANCE_CYCLES }],
  });

  const [reorderUsers] = useMutation(REORDER_PERFORMANCE_CYCLE_USERS, {
    update(cache, _, { variables }) {
      const { cycleId: cid, userIds } = variables as { cycleId: number; userIds: number[] };
      const existing = cache.readQuery<{ performanceCycle: { users: CycleUser[] } & Record<string, unknown> }>({
        query: GET_PERFORMANCE_CYCLE,
        variables: { id: cid },
      });
      if (!existing?.performanceCycle) return;
      const byId = new Map(existing.performanceCycle.users.map((u) => [u.id, u]));
      const reordered = userIds.map((uid) => byId.get(uid)).filter(Boolean) as CycleUser[];
      cache.writeQuery({
        query: GET_PERFORMANCE_CYCLE,
        variables: { id: cid },
        data: { performanceCycle: { ...existing.performanceCycle, users: reordered } },
      });
    },
  });

  const [setRating] = useMutation(SET_RATING, {
    update(cache, _, { variables }) {
      const { cycleId: cid, userId, rating } = variables as { cycleId: number; userId: number; rating: string | null };
      const existing = cache.readQuery<{ performanceCycle: { users: CycleUser[] } & Record<string, unknown> }>({
        query: GET_PERFORMANCE_CYCLE,
        variables: { id: cid },
      });
      if (!existing?.performanceCycle) return;
      cache.writeQuery({
        query: GET_PERFORMANCE_CYCLE,
        variables: { id: cid },
        data: {
          performanceCycle: {
            ...existing.performanceCycle,
            users: existing.performanceCycle.users.map((u) =>
              u.id === userId ? { ...u, rating } : u
            ),
          },
        },
      });
    },
  });

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = users.findIndex((u) => u.id === active.id);
    const newIndex = users.findIndex((u) => u.id === over.id);
    const newOrder = arrayMove(users, oldIndex, newIndex);
    setUsers(newOrder);
    reorderUsers({ variables: { cycleId, userIds: newOrder.map((u) => u.id) } }).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleRatingChange(userId: number, rating: string | null) {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, rating } : u)));
    setRating({ variables: { cycleId, userId, rating } });
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data?.performanceCycle) return <p>Performance cycle not found.</p>;

  const { performanceCycle: cycle } = data;

  async function handleDelete() {
    await deleteCycle({ variables: { id: cycleId } });
    navigate("/users/performance-cycles");
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link to="/users/performance-cycles">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold">{cycle.title}</h1>
        <div className="flex gap-1 ml-2">
          <EditPerformanceCycleDialog cycle={cycle} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon-xs">
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete performance cycle</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{cycle.title}"? This action cannot be undone.
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

      <div className="mb-6 text-sm text-muted-foreground">
        <p>Month: {formatCycleMonth(cycle.cycleMonth)}</p>
      </div>

      <RatingBar users={users} />

      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-semibold">Users</h2>
        {saved && (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Check className="h-3.5 w-3.5" />
            Saved
          </span>
        )}
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext items={users.map((u) => u.id)} strategy={verticalListSortingStrategy}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Job Level</TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <SortableUserRow
                  key={user.id}
                  user={user}
                  cycleId={cycleId}
                  onRatingChange={handleRatingChange}
                />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
    </>
  );
}
