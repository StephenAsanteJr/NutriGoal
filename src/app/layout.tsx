import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";
import "./globals.css";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NutriGoal — Nutrition answers by the ticket",
    template: "%s · NutriGoal",
  },
  description:
    "Send in one nutrition goal at a time and a real doctor or dietitian writes back a plan within 48 hours.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodoni.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-white text-navy">{children}</body>
    </html>
  );
}
