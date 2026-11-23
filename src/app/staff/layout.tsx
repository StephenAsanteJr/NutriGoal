import { requireStaff } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { MobileNav } from "@/components/MobileNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="flex min-h-screen flex-col bg-mist/70">
      <TopNav user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10 md:pt-10">{children}</main>
      <MobileNav role={user.role} />
    </div>
  );
}
