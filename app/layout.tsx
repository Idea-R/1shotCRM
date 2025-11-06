import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "1shotCRM - AI-First CRM",
  description: "AI-powered CRM built with Next.js and Supabase",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}

