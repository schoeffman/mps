import { useState, useEffect } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CheckCheck, Medal, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

const GET_TASKS = gql`
  query GetTasks {
    tasks {
      id
      title
      description
      status
      createdAt
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($input: CreateTaskInput!) {
    createTask(input: $input) {
      id
      title
      description
      status
      createdAt
    }
  }
`;

const UPDATE_TASK_STATUS = gql`
  mutation UpdateTaskStatus($id: Int!, $status: String!) {
    updateTaskStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

const DELETE_TASK = gql`
  mutation DeleteTask($id: Int!) {
    deleteTask(id: $id)
  }
`;

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
}

type ActiveDragData = { taskId: number; source: "column" | "pyramid"; slotIndex?: number };

const COLUMNS = [
  { id: "New", label: "New" },
  { id: "Next Up", label: "Next Up" },
  { id: "Deferred", label: "Deferred" },
];

// Row 0 → 1 slot, Row 1 → 2 slots, Row 2 → 3 slots
const PYRAMID_ROWS = [[0], [1, 2], [3, 4, 5]];

function ColumnTaskCard({ task, isDragOverlay = false, onSelect }: { task: Task; isDragOverlay?: boolean; onSelect?: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `col-${task.id}`,
    data: { taskId: task.id, source: "column" } satisfies ActiveDragData,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1, cursor: isDragOverlay ? "grabbing" : "grab" }}
      {...listeners}
      {...attributes}
      onClick={() => onSelect?.(task)}
    >
      <Card className="shadow-xs">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium">{task.title}</CardTitle>
        </CardHeader>
        {task.description && (
          <CardContent className="px-4 pb-3 pt-0">
            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{task.description}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function PyramidTaskCard({ task, slotIndex, isDragOverlay = false, onSelect }: { task: Task; slotIndex: number; isDragOverlay?: boolean; onSelect?: (task: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `pyramid-card-${slotIndex}`,
    data: { taskId: task.id, source: "pyramid", slotIndex } satisfies ActiveDragData,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1, cursor: isDragOverlay ? "grabbing" : "grab", width: "100%", height: "100%" }}
      {...listeners}
      {...attributes}
      className="relative flex items-center justify-center p-2"
      onClick={() => onSelect?.(task)}
    >
      <p className="text-xs font-medium text-center leading-tight line-clamp-2">{task.title}</p>
      {slotIndex === 0 && (
        <Medal className="absolute bottom-1 right-1 size-3.5 text-yellow-500" />
      )}
      {(slotIndex === 1 || slotIndex === 2) && (
        <Medal className="absolute bottom-1 right-1 size-3.5 text-slate-400" />
      )}
      {(slotIndex === 3 || slotIndex === 4 || slotIndex === 5) && (
        <Medal className="absolute bottom-1 right-1 size-3.5 text-amber-700" />
      )}
    </div>
  );
}

function PyramidSlot({ slotIndex, task, onSelect }: { slotIndex: number; task: Task | undefined; onSelect: (task: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `pyramid-slot-${slotIndex}` });

  return (
    <div
      ref={setNodeRef}
      className={`w-64 h-16 rounded-lg border-2 flex items-center justify-center transition-colors ${
        isOver ? "border-primary bg-primary/5 border-dashed" : task ? "border-muted-foreground/60 bg-card" : "border-dashed border-muted-foreground/20 bg-muted/20"
      }`}
    >
      {task ? (
        <PyramidTaskCard task={task} slotIndex={slotIndex} onSelect={onSelect} />
      ) : (
        <span className="text-xs text-muted-foreground/50 select-none">Drop here</span>
      )}
    </div>
  );
}

function Column({ id, label, tasks, onSelect }: { id: string; label: string; tasks: Task[]; onSelect: (task: Task) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-sm">{label}</h2>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div ref={setNodeRef} className={`flex flex-col gap-2 rounded-lg p-2 min-h-32 transition-colors ${isOver ? "bg-muted" : "bg-muted/40"}`}>
        {tasks.map((task) => (
          <ColumnTaskCard key={task.id} task={task} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

export default function Tasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pyramidSlots, setPyramidSlots] = useState<(number | null)[]>(() => {
    const stored = localStorage.getItem("mps-pyramid-slots");
    return stored ? JSON.parse(stored) : [null, null, null, null, null, null];
  });
  const [activeDragData, setActiveDragData] = useState<ActiveDragData | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [medalCounts, setMedalCounts] = useState<{ gold: number; silver: number; bronze: number }>(() => {
    const stored = localStorage.getItem("mps-medal-counts");
    return stored ? JSON.parse(stored) : { gold: 0, silver: 0, bronze: 0 };
  });

  const { data } = useQuery(GET_TASKS);
  const [createTask, { loading }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });
  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS);
  const [deleteTask] = useMutation(DELETE_TASK, { refetchQueries: [{ query: GET_TASKS }] });

  const tasks: Task[] = data?.tasks ?? [];
  const activeTask = activeDragData ? (tasks.find((t) => t.id === activeDragData.taskId) ?? null) : null;
  const pyramidTaskIds = new Set(pyramidSlots.filter((id): id is number => id !== null));

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  useEffect(() => {
    localStorage.setItem("mps-pyramid-slots", JSON.stringify(pyramidSlots));
  }, [pyramidSlots]);

  function incrementMedal(type: "gold" | "silver" | "bronze") {
    setMedalCounts((prev) => {
      const next = { ...prev, [type]: prev[type] + 1 };
      localStorage.setItem("mps-medal-counts", JSON.stringify(next));
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createTask({ variables: { input: { title, description } } });
    setTitle("");
    setDescription("");
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragData(event.active.data.current as ActiveDragData);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDragData(null);
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as ActiveDragData;
    const taskId = activeData.taskId;
    const overId = over.id as string;

    if (overId.startsWith("pyramid-slot-")) {
      const targetIndex = parseInt(overId.replace("pyramid-slot-", ""));
      const evictedTaskId = pyramidSlots[targetIndex];
      setPyramidSlots((prev) => {
        const next = [...prev];
        // If dragging from another pyramid slot, swap evicted task into source slot
        if (activeData.source === "pyramid" && activeData.slotIndex !== undefined) {
          next[activeData.slotIndex] = evictedTaskId;
        }
        next[targetIndex] = taskId;
        return next;
      });
    } else if (COLUMNS.some((c) => c.id === overId)) {
      // If card came from a pyramid slot, vacate it
      if (activeData.source === "pyramid" && activeData.slotIndex !== undefined) {
        setPyramidSlots((prev) => {
          const next = [...prev];
          next[activeData.slotIndex!] = null;
          return next;
        });
      }
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === overId) return;
      await updateTaskStatus({
        variables: { id: taskId, status: overId },
        optimisticResponse: {
          updateTaskStatus: { __typename: "Task", id: taskId, status: overId },
        },
      });
    }
  }

  return (
    <>
      <div className="flex items-baseline gap-4">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <Link to="/tasks/completed" className="text-sm text-muted-foreground hover:underline">
          Completed Tasks
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1">
            <Medal className="size-4 text-yellow-500" />
            <span className="font-medium">{medalCounts.gold}</span>
          </span>
          <span className="flex items-center gap-1">
            <Medal className="size-4 text-slate-400" />
            <span className="font-medium">{medalCounts.silver}</span>
          </span>
          <span className="flex items-center gap-1">
            <Medal className="size-4 text-amber-700" />
            <span className="font-medium">{medalCounts.bronze}</span>
          </span>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="mt-6 flex gap-8 items-center overflow-x-auto">

          {/* Form */}
          <form onSubmit={handleSubmit} className="grid gap-4 w-80 shrink-0">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                placeholder="Task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Add a description…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>
            <Button type="submit" disabled={loading || !title} className="w-fit">
              {loading ? "Adding..." : "Add Task"}
            </Button>
          </form>

          {/* Pyramid */}
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-semibold mb-1">Priority Pyramid</p>
            {PYRAMID_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-2">
                {row.map((slotIndex) => (
                  <PyramidSlot
                    key={slotIndex}
                    slotIndex={slotIndex}
                    task={pyramidSlots[slotIndex] != null ? tasks.find((t) => t.id === pyramidSlots[slotIndex]) : undefined}
                    onSelect={setSelectedTask}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Columns */}
        <div className="mt-8 flex gap-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              tasks={tasks.filter((t) => t.status === col.id && !pyramidTaskIds.has(t.id))}
              onSelect={setSelectedTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            activeDragData?.source === "pyramid" ? (
              <div className="w-64 h-16 rounded-lg border-2 border-border bg-card flex items-center justify-center p-2 cursor-grabbing shadow-md">
                <p className="text-xs font-medium text-center leading-tight line-clamp-2">{activeTask.title}</p>
              </div>
            ) : (
              <div className="cursor-grabbing">
                <Card className="shadow-md">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm font-medium">{activeTask.title}</CardTitle>
                  </CardHeader>
                  {activeTask.description && (
                    <CardContent className="px-4 pb-3 pt-0">
                      <p className="text-xs text-muted-foreground">{activeTask.description}</p>
                    </CardContent>
                  )}
                </Card>
              </div>
            )
          )}
        </DragOverlay>
      </DndContext>

      <Sheet open={!!selectedTask} onOpenChange={(open) => { if (!open) setSelectedTask(null); }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{selectedTask?.title}</SheetTitle>
          </SheetHeader>
          {selectedTask?.description && (
            <p className="mt-4 text-sm text-muted-foreground whitespace-pre-wrap px-6">{selectedTask.description}</p>
          )}
          <SheetFooter className="flex-row gap-2">
            <Button
              className="flex-1"
              variant="default"
              onClick={async () => {
                if (!selectedTask) return;
                const slotIndex = pyramidSlots.findIndex((id) => id === selectedTask.id);
                if (slotIndex === 0) {
                  incrementMedal("gold");
                } else if (slotIndex === 1 || slotIndex === 2) {
                  incrementMedal("silver");
                } else if (slotIndex >= 3) {
                  incrementMedal("bronze");
                }
                if (slotIndex !== -1) {
                  setPyramidSlots((prev) => prev.map((id) => (id === selectedTask.id ? null : id)));
                }
                await updateTaskStatus({
                  variables: { id: selectedTask.id, status: "Complete" },
                  optimisticResponse: { updateTaskStatus: { __typename: "Task", id: selectedTask.id, status: "Complete" } },
                  refetchQueries: ["GetTasks"],
                });
                setSelectedTask(null);
              }}
            >
              <CheckCheck className="size-4 mr-2" />
              Complete
            </Button>
            <Button
              className="flex-1"
              variant="destructive"
              onClick={async () => {
                if (!selectedTask) return;
                setPyramidSlots((prev) => prev.map((id) => (id === selectedTask.id ? null : id)));
                await deleteTask({ variables: { id: selectedTask.id } });
                setSelectedTask(null);
              }}
            >
              <Trash2 className="size-4 mr-2" />
              Delete
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
