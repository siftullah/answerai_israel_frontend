import { cn } from "@/lib/utils";

/**
 * Shared wrapper giving every section table the same look: tinted header
 * row, roomier cells, quieter row hover, emphasized first column.
 */
export function DataTableShell({ className, children }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border",
        "[&_thead]:bg-muted/50 [&_th]:h-11 [&_th]:px-4 [&_th]:text-muted-foreground",
        "[&_td]:px-4 [&_td]:py-3.5 [&_tbody_tr:hover]:bg-muted/30",
        "[&_tbody_td:first-child]:font-medium",
        className
      )}
    >
      {children}
    </div>
  );
}
