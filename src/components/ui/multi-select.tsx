"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Search, Check, ChevronsUpDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
  group?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  values: string[]
  onValuesChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
}

export function MultiSelect({
  options,
  values,
  onValuesChange,
  placeholder = "Sélectionner...",
  searchPlaceholder = "Rechercher...",
  emptyMessage = "Aucun résultat",
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const selectedLabels = options.filter((o) => values.includes(o.value)).map((o) => o.label)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const groups = React.useMemo(() => {
    const map = new Map<string, MultiSelectOption[]>()
    for (const option of filtered) {
      const key = option.group ?? ""
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(option)
    }
    return Array.from(map.entries())
  }, [filtered])

  React.useEffect(() => {
    if (open) {
      setQuery("")
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value))
    } else {
      onValuesChange([...values, value])
    }
  }

  // Coche/décoche tout le groupe d'un coup (ex: tout le lycée, tout le collège).
  const toggleGroup = (groupOptions: MultiSelectOption[]) => {
    const groupValues = groupOptions.map((o) => o.value)
    const allSelected = groupValues.every((v) => values.includes(v))
    onValuesChange(
      allSelected
        ? values.filter((v) => !groupValues.includes(v))
        : [...values, ...groupValues.filter((v) => !values.includes(v))]
    )
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn("truncate text-left", selectedLabels.length === 0 && "text-muted-foreground")}>
            {selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder}
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
              <p className="px-2 py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
            )}
            {groups.map(([group, groupOptions]) => {
              const groupValues = groupOptions.map((o) => o.value)
              const allSelected = groupValues.every((v) => values.includes(v))
              const someSelected = !allSelected && groupValues.some((v) => values.includes(v))
              return (
                <div key={group || "_"}>
                  {group && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupOptions)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 pb-1 pt-2 text-left hover:bg-accent/50"
                    >
                      <span
                        className={cn(
                          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border border-input",
                          (allSelected || someSelected) && "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {allSelected && <Check className="h-2.5 w-2.5" />}
                        {someSelected && <Minus className="h-2.5 w-2.5" />}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                        {group}
                      </span>
                    </button>
                  )}
                  {groupOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => toggle(option.value)}
                      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input",
                          values.includes(option.value) && "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {values.includes(option.value) && <Check className="h-3 w-3" />}
                      </span>
                      <span className="truncate">{option.label}</span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
