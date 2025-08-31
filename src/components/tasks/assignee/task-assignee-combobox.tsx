'use client';
import { useRef } from 'react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from '~/components/ui/command';
import { useListProfilesQuery } from '~/store/api/profilesApi';

type Props = {
  onSelect: (assigneeId: string) => void;
};

export function TaskAssigneeCombobox({ onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: profiles = [] } = useListProfilesQuery();

  return (
    <Command onMouseOver={() => inputRef.current?.focus()}>
      <CommandInput
        ref={inputRef}
        placeholder="Change assignee..."
        className="h-9"
      />
      <CommandList>
        <CommandEmpty>No user found.</CommandEmpty>
        <CommandGroup>
          {profiles.map((p) => (
            <CommandItem
              key={p.id}
              value={p.email}
              onSelect={() => onSelect(p.email)}
              className="flex items-center gap-2"
            >
              <img
                src={
                  p.avatar_url ??
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    p.email
                  )}`
                }
                alt={p.name ?? p.email}
                className="size-5 rounded-full"
              />
              <span>{p.name ?? p.email}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
