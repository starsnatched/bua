import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BUA - Virtual Desktop",
  description: "Browser-based virtual desktop environment powered by Docker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
