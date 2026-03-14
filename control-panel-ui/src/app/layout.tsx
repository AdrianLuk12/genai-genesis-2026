import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ConfirmProvider } from "@/components/ui/confirm-modal";
import { Sidebar } from "@/components/ui/sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monkey Labs",
  description: "Sandbox testing platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ConfirmProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-[1400px] mx-auto px-8 py-6">
                {children}
              </div>
            </main>
          </div>
        </ConfirmProvider>
      </body>
    </html>
  );
}
