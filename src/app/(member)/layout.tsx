import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "member") redirect("/staff");
  return (
    <div className="flex min-h-screen flex-col bg-mist/60">
      <TopNav user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">{children}</main>
      <footer className="border-t border-line bg-white py-5 text-center text-[11px] text-muted">
        NutriGoal gives general nutrition guidance from licensed clinicians. It does not replace your own doctor. Demo build — payments are simulated.
      </footer>
    </div>
  );
}
