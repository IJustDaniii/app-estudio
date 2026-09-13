import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "Aula 1B", template: "%s · Aula 1B" },
  description: "Organización académica para 1.º de Bachillerato",
  applicationName: "Aula 1B",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon-192.png" },
  appleWebApp: { capable: true, title: "Aula 1B", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
  { media: "(prefers-color-scheme: dark)", color: "#16171a" },
] };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <PwaRegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
