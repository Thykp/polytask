'use client';

import { supabase } from '~/lib/supabase'
import { store } from '~/store/store'
import { tasksApi } from '~/store/api/tasksApi'
import { cn } from '~/lib/utils';
import { useAppDispatch, useAppSelector } from '~/store/hooks';
import { selectSelectedTaskId } from '~/store/features/tasks/tasks-selectors';
import { TaskItem } from '~/components/tasks/task-item';
import { TaskToolbar } from '~/components/tasks/task-toolbar';
import { TaskDetails } from '~/components/tasks/task-details';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useEffect, useMemo } from 'react';
import {
  taskSelectNextCommandCreator,
  taskSelectPreviousCommandCreator,
  taskUnselectCommandCreator,
} from './task-commands';
import { useCommands } from '~/components/commands/commands-context';
import { TaskStatusSummary } from '~/components/tasks/status/task-status-summary';
import type {
  TaskObject,
  TaskPriority,
  TaskStatus,
  TaskAssignee,
} from '~/components/tasks/types';
import { TaskEmptyState } from '~/components/tasks/task-empty-state';
import { useMediaQuery } from '~/lib/use-media-query';

// RTK Query (shared-board)
import {
  useListTasksQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  type Task as ApiTask,
} from '~/store/api/tasksApi';

/** ---------- Adapters: API <-> UI ---------- **/

type ApiStatus = ApiTask['status'];       // 'todo' | 'in_progress' | 'done'
type ApiPriority = ApiTask['priority'];   // 'low' | 'medium' | 'high' | 'urgent'

/** Create a minimal TaskAssignee from an email string. */
function assigneeFromEmail(email?: string | null): TaskAssignee | null {
  if (!email) return null;
  const seed = encodeURIComponent(email.trim().toLowerCase());
  const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`;
  return { id: email, name: email, avatar };
}

/** API priority string -> numeric TaskPriority */
function priorityApiToUi(p: ApiPriority): TaskPriority {
  switch (p) {
    case 'low': return 0 as TaskPriority;
    case 'medium': return 1 as TaskPriority;
    case 'high': return 2 as TaskPriority;
    case 'urgent':
    default: return 3 as TaskPriority; // map anything else to 3+ (urgent bucket)
  }
}

/** numeric TaskPriority -> API priority string */
function priorityUiToApi(p: TaskPriority): ApiPriority {
  const n = Number(p);
  if (Number.isNaN(n) || n <= 0) return 'low';
  if (n === 1) return 'medium';
  if (n === 2) return 'high';
  return 'urgent'; // n >= 3
}

/** API status -> UI status */
function statusApiToUi(s: ApiStatus): TaskStatus {
  // DB has only 3 states; map them directly
  return (s === 'in_progress' ? 'in-progress' : s) as TaskStatus;
}

/** UI status -> API status (lossy: map unsupported UI states) */
function statusUiToApi(s: TaskStatus): ApiStatus {
  // Your UI supports: 'todo' | 'in-progress' | 'in-review' | 'done' | 'cancelled'
  // DB supports:      'todo' | 'in_progress' | 'done'
  if (s === 'in-progress' || s === 'in-review') return 'in_progress';
  if (s === 'cancelled') return 'done'; // or choose 'todo' if you prefer; DB has no 'cancelled'
  return (s === 'done' ? 'done' : 'todo') as ApiStatus;
}

/** Shape bridge: ApiTask -> TaskObject */
function apiToUiTask(t: ApiTask): TaskObject {
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? '',
    status: statusApiToUi(t.status),
    priority: priorityApiToUi(t.priority),
    assignee: assigneeFromEmail(t.assignee_email), // ← now TaskAssignee | null
    labels: [], // DB doesn’t have labels; keep empty array for now
    createdAt: t.created_at ?? '',
    updatedAt: t.updated_at ?? '',
  };
}

/** ----------------------------------------- **/

export function TaskList() {
  const { registerCommand } = useCommands();
  const dispatch = useAppDispatch();

const { data: tasksData, isLoading, error } = useListTasksQuery();

const tasks: TaskObject[] = useMemo(() => {
  if (!tasksData) return [];
  return tasksData.map(apiToUiTask);
}, [tasksData]);

  const selectedTaskId = useAppSelector(selectSelectedTaskId);
  const selectedTask: TaskObject | null = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId]
  );

  const hasSelection = !!selectedTaskId;
  const isDesktop = useMediaQuery('(min-width: 1024px)', true);

  const [updateTaskMutation] = useUpdateTaskMutation();
  const [deleteTaskMutation] = useDeleteTaskMutation();

  async function handleDeleteTask(id: string) {
    await deleteTaskMutation({ id });
  }

  function renderListSection() {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full text-sm opacity-70">
          Loading tasks…
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex items-center justify-center h-full text-sm text-red-600">
          Failed to load tasks.
        </div>
      );
    }

    return (
      <div className={cn('flex flex-col size-full', 'divide-y divide-input')}>
        {tasks.length === 0 ? (
          <TaskEmptyState />
        ) : (
          <>
            <ScrollArea className="h-0 grow">
              <div className="size-full">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onAssigneeChange={async (assigneeId) => {
                      // TaskItem passes an id (string | undefined | null). API expects string | undefined.
                      await updateTaskMutation({
                        id: task.id,
                        assignee_email:
                          assigneeId == null ? undefined : String(assigneeId),
                      });
                    }}
                    onStatusChange={async (status) => {
                      await updateTaskMutation({
                        id: task.id,
                        status: statusUiToApi(status),
                      });
                    }}
                    onPriorityChange={async (priority) => {
                      await updateTaskMutation({
                        id: task.id,
                        priority: priorityUiToApi(priority),
                      });
                    }}
                    onDelete={handleDeleteTask}
                    isSelected={selectedTaskId === task.id}
                  />
                ))}
              </div>
            </ScrollArea>
            <TaskStatusSummary />
          </>
        )}
      </div>
    );
  }

  const taskDetails = selectedTask ? (
    <TaskDetails key={selectedTask.id} task={selectedTask} />
  ) : null;

  useEffect(() => {
    const unregisterNext = registerCommand(taskSelectNextCommandCreator());
    const unregisterPrevious = registerCommand(
      taskSelectPreviousCommandCreator(),
    );
    const unregisterTaskUnselect = registerCommand(
      taskUnselectCommandCreator(),
    );
    return () => {
      unregisterNext();
      unregisterPrevious();
      unregisterTaskUnselect();
    };
  }, [registerCommand, dispatch]);

  useEffect(() => {
  // Subscribe to INSERT/UPDATE/DELETE on the shared "tasks" table
  const channel = supabase
    .channel('tasks-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      // Revalidate the list so UI refreshes for everyone
      store.dispatch(tasksApi.util.invalidateTags([{ type: 'Tasks', id: 'LIST' }]))
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])

  return (
    <div
      className={cn(
        'flex flex-col',
        'border border-input',
        'rounded-sm',
        'divide-y divide-input',
        'h-full bg-background',
      )}
    >
      <div className={cn('flex items-center w-full', 'py-2 pr-2 pl-3')}>
        <TaskToolbar />
      </div>
      <div className="h-0 grow">
        <PanelGroup direction="horizontal">
          {isDesktop ? (
            <>
              <Panel
                id="desktop-list"
                minSize={50}
                defaultSize={hasSelection ? 70 : 100}
              >
                {renderListSection()}
              </Panel>
              {selectedTask && (
                <>
                  <PanelResizeHandle className="w-px bg-border cursor-col-resize" />
                  <Panel id="desktop-details" minSize={20}>
                    {taskDetails}
                  </Panel>
                </>
              )}
            </>
          ) : (
            <Panel id="mobile" minSize={0} defaultSize={100}>
              {selectedTask ? taskDetails : renderListSection()}
            </Panel>
          )}
        </PanelGroup>
      </div>
    </div>
  );
}
