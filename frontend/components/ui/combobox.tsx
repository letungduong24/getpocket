"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string | number;
  label: string;
  isOwner?: boolean;
}

interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = "Select item...",
  searchPlaceholder = "Search...",
  emptyMessage = "No item found.",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-10 w-full justify-between rounded-xl border border-primary/30 bg-input/20 px-3 text-sm font-normal transition-colors hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            {selectedOption ? (
              <span className="flex-1 truncate text-left flex items-center gap-2">
                {selectedOption.isOwner && (
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                )}
                <span className="truncate">{selectedOption.label}</span>
              </span>
            ) : (
              <span className="flex-1 truncate text-left text-muted-foreground">
                {placeholder}
              </span>
            )}
            <ChevronsUpDownIcon
              className="shrink-0 text-muted-foreground/80"
              aria-hidden="true"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className='p-0 w-[var(--radix-popper-anchor-width)] min-w-[340px]'
          align='start'
          onWheel={(e: React.WheelEvent) => e.stopPropagation()}
        >
          <Command
            onWheel={(e: React.WheelEvent) => e.stopPropagation()}
            filter={(value: string, search: string) => {
              const trimmedSearch = search.trim().toLowerCase()
              if (value.toLowerCase().includes(trimmedSearch)) return 1
              return 0
            }}
            value={
              selectedOption
                ? `${selectedOption.label}-${selectedOption.value}`
                : undefined
            }
          >
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList onWheel={(e: React.WheelEvent) => e.stopPropagation()}>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label}-${option.value}`}
                    onSelect={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="flex items-center gap-2"
                  >
                    {option.isOwner && (
                      <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{option.label}</span>
                    {value === option.value ? (
                      <CheckIcon className="ml-auto size-4" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default Combobox;
