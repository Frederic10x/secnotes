import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/layout/Providers";
import Sidebar from "@/components/layout/Sidebar";
import CommandPalette from "@/components/features/CommandPalette";
import { SidebarHamburger } from "@/components/layout/SidebarHamburger";
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
          <SidebarHamburger />
          <SidebarMobileOverlay />
          <Sidebar />
          <CommandPalette />
          <main className="lg:ml-[220px] min-h-screen bg-background">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
