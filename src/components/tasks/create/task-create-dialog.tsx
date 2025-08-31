'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { TaskTitleField } from '~/components/tasks/title/task-title-field';
import { TaskDescriptionField } from '~/components/tasks/description/task-description-field';
import { TaskStatusSelector } from '~/components/tasks/status/task-status-selector';
import { TaskAssigneeSelector } from '~/components/tasks/assignee/task-assignee-selector';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { setSelectedTask } from '~/store/features/tasks/tasks-slice';
import { selectAllTasks } from '~/store/features/tasks/tasks-selectors';
import type {
  TaskRaw,
  TaskStatus,
  TaskPriority,
} from '~/components/tasks/types';
import { TaskPrioritySelector } from '../priority/task-priority-selector';
import { taskCreateDialogOpenCommandCreator } from '../task-commands';
import { useCommands } from '~/components/commands/commands-context';

// ⬇️ NEW: Supabase + RTK Query
import { supabase } from '~/lib/supabase';
import { useCreateTaskMutation } from '~/store/api/tasksApi';
import type { Task as ApiTask } from '~/store/api/tasksApi';

function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/** ---- UI <-> API adapters (same conventions as in TaskList) ---- **/

type ApiStatus = ApiTask['status'];       // 'todo' | 'in_progress' | 'done'
type ApiPriority = ApiTask['priority'];   // 'low' | 'medium' | 'high' | 'urgent'

function priorityUiToApi(p: TaskPriority): ApiPriority {
  const n = Number(p);
  if (Number.isNaN(n) || n <= 0) return 'low';
  if (n === 1) return 'medium';
  if (n === 2) return 'high';
  return 'urgent'; // n >= 3
}

function statusUiToApi(s: TaskStatus): ApiStatus {
  // UI supports: 'todo' | 'in-progress' | 'in-review' | 'done' | 'cancelled'
  // DB supports: 'todo' | 'in_progress' | 'done'
  if (s === 'in-progress' || s === 'in-review') return 'in_progress';
  if (s === 'cancelled') return 'done'; // pick 'done' or 'todo'; DB has no 'cancelled'
  return (s === 'done' ? 'done' : 'todo') as ApiStatus;
}

const commandScope = 'create-dialog';

export function TaskCreateDialog() {
  const { registerCommand, setScope, clearScope } = useCommands();
  const dispatch = useAppDispatch();
  const tasks = useAppSelector(selectAllTasks);
  const [open, setOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>(0);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);

  // We keep nextId only for UI parity (not used by DB which autogenerates UUIDs)
  const nextId = useMemo(() => {
    let maxNum = 0;
    for (const id of tasks.map((t) => t.id)) {
      const match = id.match(/^(.*?-)(\d+)$/);
      if (match) {
        const num = parseInt(match[2], 10);
        if (!Number.isNaN(num)) maxNum = Math.max(maxNum, num);
      }
    }
    return `MUL-${maxNum + 1}`;
  }, [tasks]);

  function resetForm() {
    setTitle('');
    setDescription('');
    setStatus('todo');
    setPriority(0);
    setAssigneeId(null);
  }

  // ⬇️ NEW: RTK Query mutation
  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();

  async function handleCreate() {
    const createdAt = getTodayDateString();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Shouldn’t happen due to SessionGate, but guard anyway.
      return;
    }

    // Prepare UI TaskRaw (for local selection UI continuity)
    const uiNewTask: TaskRaw = {
      id: nextId, // local-only; DB will return a UUID id
      title: title.trim() || 'Untitled',
      description: description,
      status,
      priority,
      assigneeId: assigneeId ?? undefined,
      labels: [],
      createdAt,
      updatedAt: createdAt,
    };

    // Call API create (DB will generate id)
    const res = await createTask({
      title: uiNewTask.title,
      description: uiNewTask.description,
      status: statusUiToApi(uiNewTask.status),
      priority: priorityUiToApi(uiNewTask.priority),
      assignee_email: uiNewTask.assigneeId ?? undefined,
      created_by: user.id,
    });

    // If fulfilled, select the server id; otherwise fallback to local nextId
    
    const data = (res && 'data' in res) ? (res.data as ApiTask) : null;
    const newId = data?.id ?? uiNewTask.id;

    dispatch(setSelectedTask(newId));
    setOpen(false);
    resetForm();
  }

  const openCommand = useMemo(
    () =>
      taskCreateDialogOpenCommandCreator(() => {
        setOpen(true);
      }),
    [setOpen],
  );

  useEffect(() => {
    if (open) {
      setScope({ name: commandScope, allowGlobalKeybindings: false });
      return () => { clearScope(); };
    }
  }, [open, setScope, clearScope]);

  useEffect(() => {
    const unregisterDialogOpen = registerCommand(openCommand);
    return () => { unregisterDialogOpen(); };
  }, [registerCommand, openCommand]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          tooltip={openCommand.name}
          icon={openCommand.icon}
          variant="secondary"
          size="sm"
          aria-label={openCommand.name}
          shortcut={openCommand.shortcut}
        />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create new task</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <TaskTitleField value={title} onChange={setTitle} />
          <TaskDescriptionField
            value={description}
            onChange={setDescription}
            placeholder="Add a description..."
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground -ml-2">
            <TaskStatusSelector
              commandScope={commandScope}
              value={status}
              onChange={(s) => setStatus(s)}
            />
            <TaskPrioritySelector
              commandScope={commandScope}
              value={priority}
              onChange={(p) => setPriority(p)}
            />
            <TaskAssigneeSelector
              commandScope={commandScope}
              value={assigneeId ?? undefined}
              onChange={(a) => setAssigneeId(a)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleCreate}
            disabled={!title.trim() || isCreating}
          >
            {isCreating ? 'Creating…' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
