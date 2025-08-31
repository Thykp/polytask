'use client';

import { TaskObject, TaskPriority, TaskStatus } from '~/components/tasks/types';
import { Button } from '~/components/ui/button';
import { TaskStatusSelector } from './status/task-status-selector';
import { TaskAssigneeSelector } from './assignee/task-assignee-selector';
import { TaskDescriptionField } from './description/task-description-field';
import { TaskTitleField } from './title/task-title-field';

import { useAppDispatch, useAppSelector } from '~/store/hooks';
// ⬇️ removed local assignTask/updateTask imports
import {
  taskDeleteCommandCreator,
  taskSelectNextCommandCreator,
  taskSelectPreviousCommandCreator,
  taskUnselectCommandCreator,
} from './task-commands';
import { useCommands } from '../commands/commands-context';
import { useEffect, useMemo, useRef } from 'react';
import { cn } from '~/lib/utils';
import { TaskPrioritySelector } from './priority/task-priority-selector';
import {
  selectHasNextTask,
  selectHasPreviousTask,
} from '~/store/features/tasks/tasks-selectors';
import { RiCloseLine } from 'react-icons/ri';

// ⬇️ NEW: RTK Query mutation
import { useUpdateTaskMutation } from '~/store/api/tasksApi';

/** ---------- UI → API adapters (same as TaskList) ---------- */
type ApiStatus = 'todo' | 'in_progress' | 'done';
type ApiPriority = 'low' | 'medium' | 'high' | 'urgent';

const statusUiToApi = (s: TaskStatus): ApiStatus => {
  if (s === 'in-progress' || s === 'in-review') return 'in_progress';
  if (s === 'done') return 'done';
  if (s === 'cancelled') return 'done'; // or 'todo' if you prefer
  return 'todo';
};

const priorityUiToApi = (p: TaskPriority): ApiPriority => {
  const n = Number(p);
  if (Number.isNaN(n) || n <= 0) return 'low';
  if (n === 1) return 'medium';
  if (n === 2) return 'high';
  return 'urgent';
};
/** --------------------------------------------------------- */

export type TaskDetailsProps = {
  task: TaskObject;
};

export function TaskDetails({ task }: TaskDetailsProps) {
  const { registerCommand } = useCommands();
  const dispatch = useAppDispatch();

  const hasNextTask = useAppSelector(selectHasNextTask);
  const hasPreviousTask = useAppSelector(selectHasPreviousTask);
  const taskSelectNextCommand = taskSelectNextCommandCreator();
  const taskSelectPreviousCommand = taskSelectPreviousCommandCreator();
  const taskDeleteCommand = useMemo(
    () => taskDeleteCommandCreator(task.id),
    [task.id],
  );
  const taskUnselectCommand = useMemo(() => taskUnselectCommandCreator(), []);

  // ⬇️ RTK Query mutation
  const [updateTask] = useUpdateTaskMutation();

  // Small debouncers for title/description so we don't update on every keystroke
  const titleTimer = useRef<number | null>(null);
  const descTimer = useRef<number | null>(null);
  const DEBOUNCE_MS = 350;

  function debounceUpdate(ref: React.MutableRefObject<number | null>, patch: Parameters<typeof updateTask>[0]) {
    if (ref.current) window.clearTimeout(ref.current);
    ref.current = window.setTimeout(() => {
      updateTask(patch);
      ref.current = null;
    }, DEBOUNCE_MS) as unknown as number;
  }

  useEffect(() => {
    const unregisterTaskDelete = registerCommand(taskDeleteCommand);
    return () => {
      unregisterTaskDelete();
    };
  }, [registerCommand, taskDeleteCommand]);

  return (
    <div className={cn('divide-y divide-input')}>
      <div className={cn('flex items-center gap-2 justify-between', 'py-2 px-3')}>
        <div className="flex items-center gap-x-1.5">
          <Button
            variant="outline"
            tooltip={taskSelectNextCommand.name}
            shortcut={taskSelectNextCommand.shortcut}
            size="sm"
            onClick={() => {
              taskSelectNextCommand.action();
            }}
            disabled={!hasNextTask}
            aria-label={taskSelectNextCommand.name}
            icon={taskSelectNextCommand.icon}
          />
          <Button
            variant="outline"
            tooltip={taskSelectPreviousCommand.name}
            shortcut={taskSelectPreviousCommand.shortcut}
            size="sm"
            onClick={() => {
              taskSelectPreviousCommand.action();
            }}
            disabled={!hasPreviousTask}
            aria-label={taskSelectPreviousCommand.name}
            icon={taskSelectPreviousCommand.icon}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            tooltip={taskDeleteCommand.name}
            shortcut={taskDeleteCommand.shortcut}
            variant="ghost"
            size="sm"
            onClick={() => {
              taskDeleteCommand.action();
            }}
            aria-label={taskDeleteCommand.name}
            icon={taskDeleteCommand.icon}
          />
          <Button
            aria-label={taskUnselectCommand.name}
            tooltip={taskUnselectCommand.name}
            shortcut={taskUnselectCommand.shortcut}
            variant="ghost"
            size="sm"
            onClick={() => {
              taskUnselectCommand.action();
            }}
            icon={RiCloseLine}
          />
        </div>
      </div>
      <div className={cn('flex flex-col gap-2 px-3 py-3')}>
        <TaskTitleField
          key={task.id}
          value={task.title}
          onChange={(value) => {
            if (value !== task.title) {
              debounceUpdate(titleTimer, { id: task.id, title: value });
            }
          }}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 -ml-2">
          <TaskStatusSelector
            value={task.status}
            onChange={(newStatus) => {
              if (newStatus !== task.status) {
                updateTask({ id: task.id, status: statusUiToApi(newStatus) });
              }
            }}
          />
          <TaskPrioritySelector
            value={task.priority}
            onChange={(p) => {
              if (p !== task.priority) {
                updateTask({ id: task.id, priority: priorityUiToApi(p) });
              }
            }}
          />
          <TaskAssigneeSelector
            value={task.assignee?.id ?? undefined}
            onChange={(assigneeId) => {
              if (assigneeId !== task.assignee?.id) {
                updateTask({
                  id: task.id,
                  assignee_email:
                    assigneeId == null ? undefined : String(assigneeId),
                });
              }
            }}
          />
        </div>
        <TaskDescriptionField
          value={task.description || ''}
          onChange={(newDescription) => {
            if (newDescription !== task.description) {
              debounceUpdate(descTimer, {
                id: task.id,
                description: newDescription,
              });
            }
          }}
        />
      </div>
    </div>
  );
}
