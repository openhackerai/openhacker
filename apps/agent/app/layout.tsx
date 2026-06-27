import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenHacker",
  description: "Autonomous application security agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <Link href="/" className="brand">
            open<span>hacker</span>
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
