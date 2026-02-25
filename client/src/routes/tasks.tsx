import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
}

const COLUMNS = [
  { id: "Backlog", label: "Backlog" },
  { id: "Today", label: "Today" },
  { id: "Deferred", label: "Deferred" },
];

function TaskCard({ task, isDragOverlay = false }: { task: Task; isDragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragOverlay ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
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

function Column({ id, label, tasks }: { id: string; label: string; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col gap-3 flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-sm">{label}</h2>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{tasks.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 rounded-lg p-2 min-h-32 transition-colors ${isOver ? "bg-muted" : "bg-muted/40"}`}
      >
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export default function Tasks() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const { data } = useQuery(GET_TASKS);
  const [createTask, { loading }] = useMutation(CREATE_TASK, {
    refetchQueries: [{ query: GET_TASKS }],
  });
  const [updateTaskStatus] = useMutation(UPDATE_TASK_STATUS);

  const tasks: Task[] = data?.tasks ?? [];

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createTask({ variables: { input: { title, description } } });
    setTitle("");
    setDescription("");
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = active.id as number;
    const newStatus = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;
    await updateTaskStatus({
      variables: { id: taskId, status: newStatus },
      optimisticResponse: {
        updateTaskStatus: { __typename: "Task", id: taskId, status: newStatus },
      },
    });
  }

  return (
    <>
      <h1 className="text-2xl font-semibold">Tasks</h1>
      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 max-w-lg">
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

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="mt-8 flex gap-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              label={col.label}
              tasks={tasks.filter((t) => t.status === col.id)}
            />
          ))}
        </div>
        <DragOverlay>
          {activeTask && <TaskCard task={activeTask} isDragOverlay />}
        </DragOverlay>
      </DndContext>
    </>
  );
}
