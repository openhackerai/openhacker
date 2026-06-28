import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "openhacker",
  description: "Analyze a GitHub repo for vulnerabilities",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
