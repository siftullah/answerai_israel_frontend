import { SectionNav } from "@/components/business-profile/section-nav";

export default function BusinessProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:gap-8">
      <SectionNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
