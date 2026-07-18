"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Search, Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchableSelectOption {
  value: string
  label: string
  keywords?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  emptyMessage = "Aucun résultat",
  disabled,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selected = options.find((o) => o.value === value)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => `${o.label} ${o.keywords ?? ""}`.toLowerCase().includes(q))
  }, [options, query])

  React.useEffect(() => {
    if (open) {
      setQuery("")
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className="z-50 w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </p>
            )}
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onValueChange(option.value)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    option.value === value ? "opacity-100" : "opacity-0"
                  )}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
