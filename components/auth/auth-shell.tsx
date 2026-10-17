import Link from "next/link";
import { Logo } from "@/components/logo";
import { BrandPanel } from "./brand-panel";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen flex-1 lg:grid-cols-2">
      <div className="flex flex-col gap-6 p-6 pb-3 sm:p-10 sm:pb-4">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <Link href="/" className="mb-4 self-start">
              <Logo className="h-16" />
            </Link>
            {children}
          </div>
        </div>

        <footer className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <a
            href="https://answerai.com.au/privacy"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Privacy Policy
          </a>
          <span aria-hidden className="h-3 w-px bg-border" />
          <a
            href="https://answerai.com.au/terms"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            Terms of Service
          </a>
        </footer>
      </div>

      <div className="relative hidden overflow-hidden lg:block">
        <BrandPanel />
      </div>
    </div>
  );
}
