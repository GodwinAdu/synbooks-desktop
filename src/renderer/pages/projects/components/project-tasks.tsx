/**
 * Project Tasks Tab
 * Task management: list, add, toggle status, delete.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, Circle, Clock } from "lucide-react";

interface ProjectTask {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: string;
  assignedTo?: string;
  dueDate?: string;
  completedAt?: string;
  sortOrder: number;
}

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: typeof Circle }> = {
  todo: { label: "To Do", class: "bg-gray-100 text-gray-700", icon: Circle },
  in_progress: { label: "In Progress", class: "bg-blue-100 text-blue-700", icon: Clock },
  done: { label: "Done", class: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
};

const NEXT_STATUS: Record<string, "todo" | "in_progress" | "done"> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

interface ProjectTasksProps {
  projectId: string;
}

export function ProjectTasks({ projectId }: ProjectTasksProps) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchTasks = () => {
    setLoading(true);
    api.get(`/projects/${projectId}/tasks`)
      .then((res: any) => setTasks(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTasks(); }, [projectId]);

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setAdding(true);
    try {
      await api.post(`/projects/${projectId}/tasks`, { title });
      setNewTitle("");
      fetchTasks();
      toast.success("Task added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add task");
    } finally {
      setAdding(false);
    }
  };

  const toggleStatus = async (task: ProjectTask) => {
    const nextStatus = NEXT_STATUS[task.status];
    const update: any = { status: nextStatus };
    if (nextStatus === "done") update.completedAt = new Date().toISOString();
    else update.completedAt = null;
    try {
      await api.put(`/projects/${projectId}/tasks/${task.id}`, update);
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, ...update } : t));
    } catch (e: any) {
      toast.error("Failed to update task");
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success("Task deleted");
    } catch (e: any) {
      toast.error("Failed to delete task");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !adding) addTask();
  };

  // Group tasks by status
  const grouped = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    done: tasks.filter((t) => t.status === "done"),
  };

  return (
    <div className="space-y-4">
      {/* Add task inline */}
      <div className="flex gap-2">
        <Input
          placeholder="Add a new task..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={adding}
          className="flex-1"
        />
        <Button onClick={addTask} disabled={adding || !newTitle.trim()} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-10 w-10 mx-auto text-muted-foreground opacity-20 mb-3" />
          <p className="text-sm text-muted-foreground">No tasks yet. Add one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(["todo", "in_progress", "done"] as const).map((status) => {
            const items = grouped[status];
            if (items.length === 0) return null;
            const config = STATUS_CONFIG[status];
            return (
              <Card key={status}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Badge className={`${config.class} text-xs`}>{config.label}</Badge>
                    <span className="text-muted-foreground">({items.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {items.map((task) => {
                    const Icon = STATUS_CONFIG[task.status].icon;
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors group"
                      >
                        <button
                          onClick={() => toggleStatus(task)}
                          className="shrink-0 hover:scale-110 transition-transform"
                          title={`Click to move to ${NEXT_STATUS[task.status].replace("_", " ")}`}
                        >
                          <Icon className={`h-4.5 w-4.5 ${task.status === "done" ? "text-emerald-600" : task.status === "in_progress" ? "text-blue-600" : "text-gray-400"}`} />
                        </button>
                        <span className={`flex-1 text-sm ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                          {task.title}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(task.dueDate).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-600"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
