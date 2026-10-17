import { cn } from "@/lib/utils";

/**
 * A borderless detail section: bold heading + content. Sections are separated
 * by the pane's dividers, not their own card chrome (rings clipped inside the
 * scroll container). `accent` tints the heading in the brand teal.
 */
export function DetailCard({
  title,
  description,
  actions,
  accent = false,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3
            className={cn(
              "font-heading text-base font-semibold",
              accent ? "text-cta" : "text-foreground"
            )}
          >
            {title}
          </h3>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
