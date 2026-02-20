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
  craftAbility: string;
  jobLevel: string;
}

const GET_PERFORMANCE_CYCLE = gql`
  query GetPerformanceCycle($id: Int!) {
    performanceCycle(id: $id) {
      id
      title
      cycleMonth
      users {
        id
        fullName
        craftAbility
        jobLevel
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

function formatCycleMonth(cycleMonth: string) {
  return new Date(cycleMonth + "-01").toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const enumLabels: Record<string, string> = {
  ProductManagement: "Product Management",
  DataScience: "Data Science",
};

function formatEnum(value: string) {
  return enumLabels[value] ?? value;
}

function SortableUserRow({ user }: { user: CycleUser }) {
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
      <TableCell>{formatEnum(user.craftAbility)}</TableCell>
      <TableCell>{user.jobLevel}</TableCell>
    </TableRow>
  );
}

export default function PerformanceCycleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { loading, error, data } = useQuery(GET_PERFORMANCE_CYCLE, {
    variables: { id: Number(id) },
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
      const { cycleId, userIds } = variables as { cycleId: number; userIds: number[] };
      const existing = cache.readQuery<{ performanceCycle: { users: CycleUser[] } & Record<string, unknown> }>({
        query: GET_PERFORMANCE_CYCLE,
        variables: { id: cycleId },
      });
      if (!existing?.performanceCycle) return;
      const byId = new Map(existing.performanceCycle.users.map((u) => [u.id, u]));
      const reordered = userIds.map((uid) => byId.get(uid)).filter(Boolean) as CycleUser[];
      cache.writeQuery({
        query: GET_PERFORMANCE_CYCLE,
        variables: { id: cycleId },
        data: { performanceCycle: { ...existing.performanceCycle, users: reordered } },
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
    reorderUsers({ variables: { cycleId: Number(id), userIds: newOrder.map((u) => u.id) } }).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!data?.performanceCycle) return <p>Performance cycle not found.</p>;

  const { performanceCycle: cycle } = data;

  async function handleDelete() {
    await deleteCycle({ variables: { id: Number(id) } });
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
                <TableHead>Craft Ability</TableHead>
                <TableHead>Job Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <SortableUserRow key={user.id} user={user} />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>
    </>
  );
}
