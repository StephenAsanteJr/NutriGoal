import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { TopNav } from "@/components/TopNav";
import { MobileNav } from "@/components/MobileNav";
import { Assistant } from "@/components/Assistant";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "member") redirect(homeFor(user));
  const settings = getSettings(user.id);
  return (
    <div className="flex min-h-screen flex-col bg-mist/60">
      <TopNav user={user} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 md:pt-10">{children}</main>
      <footer className="hidden border-t border-line bg-white py-5 text-center text-[11px] text-muted md:block">
        NutriGoal gives general nutrition guidance from licensed clinicians. It does not replace your own doctor.
      </footer>
      {user.onboarding_complete ? <MobileNav role="member" /> : null}
      {user.onboarding_complete && settings.assistant_enabled ? <Assistant firstName={user.name.split(" ")[0]} /> : null}
    </div>
  );
}
