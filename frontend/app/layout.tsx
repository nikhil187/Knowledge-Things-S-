import type { Metadata, Viewport } from "next";
import "./globals.css";
import { GameProvider } from "./context/GameContext";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Knowledge Things – Cooperative Quiz for Grades 3–5",
  description: "Play quizzes together with friends. Pick a subject, create a room, and answer AI-generated questions as a team. Grades 3–5.",
  keywords: ["quiz", "education", "kids", "multiplayer", "cooperative", "grades 3-5"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Knowledge Things",
  },
  openGraph: {
    title: "Knowledge Things – Cooperative Quiz for Grades 3–5",
    description: "Play quizzes together with friends. Grades 3–5.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Knowledge Things – Cooperative Quiz for Grades 3–5",
    description: "Play quizzes together with friends. Grades 3–5.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#7c3aed",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-800 antialiased" style={{ background: "var(--color-bg)" }}>
        <GameProvider>
          <AppShell>{children}</AppShell>
        </GameProvider>
      </body>
    </html>
  );
}
