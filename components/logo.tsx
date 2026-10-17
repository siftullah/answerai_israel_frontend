import { cn } from "@/lib/utils";

/**
 * Brand logo. `color` for light backgrounds, `white` for the brand panel
 * and dark surfaces. Plain <img> — the SVGs live in /public.
 */
export function Logo({
  variant = "color",
  className,
}: {
  variant?: "color" | "white";
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={variant === "white" ? "/logo-white.svg" : "/logo.svg"}
      alt="AnswerAI"
      className={cn("h-8 w-auto", className)}
    />
  );
}
