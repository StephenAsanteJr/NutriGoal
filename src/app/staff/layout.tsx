import { requireStaff } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();
  return (
    <div className="flex min-h-screen flex-col bg-mist/70">
      <TopNav user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
