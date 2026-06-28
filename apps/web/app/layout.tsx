import type { Metadata } from "next";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";

const description = "hacking soon";

export const metadata: Metadata = {
  metadataBase: new URL("https://openhacker.ai"),
  title: "openhacker",
  description,
  openGraph: { title: "openhacker", description, type: "website" },
  twitter: { card: "summary_large_image", title: "openhacker", description },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={GeistPixelSquare.className}>{children}</body>
    </html>
  );
}
