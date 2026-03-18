export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import Sidebar from "@/components/layout/Sidebar";
import CommandPalette from "@/components/features/CommandPalette";
import { MiniRail } from "@/components/layout/MiniRail";
import { SidebarMobileOverlay } from "@/components/layout/SidebarMobileOverlay";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SecNotes",
  description: "Notes de cybersécurité personnelles",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>
          {/* Fixed elements (overlays, full sidebar, command palette) */}
          <SidebarMobileOverlay />
          <Sidebar />
          <CommandPalette />

          {/* Document flow: mini rail (mobile) + main content */}
          <div className="flex lg:block min-h-screen">
            <MiniRail />
            <main className="flex-1 min-h-screen overflow-x-clip lg:ml-[220px] bg-background">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
