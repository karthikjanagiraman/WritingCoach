import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { ActiveChildProvider } from "@/contexts/ActiveChildContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "WriteWhiz",
  description: "From blank page to writing whiz — AI writing coach for kids ages 7-15",
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
        <link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <SessionProvider>
          <ActiveChildProvider>
            {children}
          </ActiveChildProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
