import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/RegisterSW";
import { ReadAloudBar } from "@/components/ReadAloud";
import { Bodoni_Moda, Montserrat } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  display: "swap",
});

// Wordmark face, matching the NUTRI GOAL logo lettering.
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NutriGoal — Health · Balance · Success",
    template: "%s · NutriGoal",
  },
  description:
    "Send in one nutrition goal at a time and a real doctor or dietitian writes back a plan within 48 hours.",
  appleWebApp: { capable: true, title: "NutriGoal", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0c2b15",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Demo notice for a separate demo copy: shown only with NUTRIGOAL_DEMO_BANNER=on.
const showDemoBanner = process.env.NUTRIGOAL_DEMO_BANNER === "on";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodoni.variable} ${montserrat.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-white text-ink">
        {showDemoBanner && (
          <div role="note" className="bg-amber-100 px-4 py-2 text-center text-sm text-ink">
            Demo site with sample data: please don&rsquo;t enter real health information.
          </div>
        )}
        {children}
        <RegisterSW />
        <ReadAloudBar />
      </body>
    </html>
  );
}
