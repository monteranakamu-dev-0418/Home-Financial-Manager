import type { Metadata } from "next";
import { Geist, Zen_Maru_Gothic } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/contexts/user-context";
import { ModeProvider } from "@/contexts/mode-context";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const zenMaruGothic = Zen_Maru_Gothic({
  variable: "--font-zen-maru",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "家計管理",
  description: "中村・寺本の家計管理アプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "家計管理",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={`${geistSans.variable} ${zenMaruGothic.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <ModeProvider>
          <UserProvider>{children}</UserProvider>
        </ModeProvider>
      </body>
    </html>
  );
}
