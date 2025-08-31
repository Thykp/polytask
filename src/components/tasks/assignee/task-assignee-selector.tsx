'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '~/components/ui/popover';
import { Button } from '~/components/ui/button';
import { useCommands } from '~/components/commands/commands-context';
import { taskAssigneeOpenCommandCreator } from '../task-commands';
import { TaskAssigneeCombobox } from './task-assignee-combobox';
import { useListProfilesQuery } from '~/store/api/profilesApi';

export type TaskAssigneeSelectorProps = {
  commandScope?: string;
  value?: string | null;
  onChange: (assigneeId: string) => void;
};

export function TaskAssigneeSelector({
  commandScope,
  value,
  onChange,
}: TaskAssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const { registerCommand } = useCommands();
  const { data: profiles = [] } = useListProfilesQuery();

  const taskAssigneeOpenCommandObj = taskAssigneeOpenCommandCreator(() => {});
  const Icon = taskAssigneeOpenCommandObj.icon; // ✅ Fix: capitalize component

  const openCommand = useMemo(
    () =>
      taskAssigneeOpenCommandCreator(() => {
        setOpen(true);
      }),
    [setOpen],
  );

  useEffect(() => {
    const unregisterAssignee = registerCommand(openCommand, commandScope);
    return () => {
      unregisterAssignee();
    };
  }, [registerCommand, openCommand, commandScope]);

  const assignee = profiles.find((p) => p.email === value) || null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          tooltip={openCommand.name}
          shortcut={openCommand.shortcut}
          className="flex items-center gap-1"
          aria-label={openCommand.name}
        >
          {assignee ? (
            <img
              src={
                assignee.avatar_url ??
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  assignee.email,
                )}`
              }
              alt={assignee.name ?? assignee.email}
              className="size-5 rounded-full"
            />
          ) : (
            <Icon className="size-5 rounded-full bg-muted" />
          )}
          <span className="text-xs font-medium">
            {assignee ? assignee.name ?? assignee.email : 'Unassigned'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-48">
        <TaskAssigneeCombobox
          onSelect={(assigneeEmail) => {
            onChange(assigneeEmail);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
