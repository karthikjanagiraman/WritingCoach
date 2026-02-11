import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WriteWise Kids",
  description: "AI-powered writing coach for young writers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&family=DM+Sans:wght@400;500;700&family=Sora:wght@400;500;600;700&family=Literata:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
