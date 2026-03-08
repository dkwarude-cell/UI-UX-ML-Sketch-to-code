import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SketchToCode — Draw UI, Get Code",
  description:
    "Draw a wireframe on a canvas and instantly generate production-ready HTML + Tailwind CSS using AI.",
  keywords: ["sketch to code", "wireframe", "AI", "HTML", "Tailwind CSS", "Claude"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

