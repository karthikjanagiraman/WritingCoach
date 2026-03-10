import type { Metadata, Viewport } from "next";
import { Nunito, DM_Sans, Sora, Literata } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { ActiveChildProvider } from "@/contexts/ActiveChildContext";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | WriteWhiz",
    default: "AI Writing Coach for Kids Ages 7-15 | WriteWhiz",
  },
  description:
    "WriteWhiz is an AI-powered writing coach that teaches kids ages 7-15 creative, persuasive, and expository writing through personalized lessons, real-time feedback, and fun motivation.",
  keywords: [
    "AI writing coach for kids",
    "kids writing app",
    "creative writing for children",
    "online writing tutor for kids",
    "writing practice for kids",
    "learn to write for children",
    "AI writing tutor",
    "children writing program",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.writewhiz.com",
    siteName: "WriteWhiz",
    title: "WriteWhiz — AI Writing Coach for Kids Ages 7-15",
    description:
      "An AI writing coach that teaches, encourages, and adapts — so your child discovers the joy of writing. Personalized lessons for ages 7-15.",
    images: [
      {
        url: "https://www.writewhiz.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "WriteWhiz — From blank page to writing whiz",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "WriteWhiz — AI Writing Coach for Kids Ages 7-15",
    description:
      "An AI writing coach that teaches, encourages, and adapts — so your child discovers the joy of writing.",
    images: ["https://www.writewhiz.com/og-image.png"],
  },
  alternates: {
    canonical: "https://www.writewhiz.com",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: { url: "/brand/favicon.svg", type: "image/svg+xml" },
    apple: "/brand/icon-192.svg",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6C5CE7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "WriteWhiz",
              url: "https://www.writewhiz.com",
              logo: "https://www.writewhiz.com/brand/icon-512.svg",
              description:
                "AI-powered creative writing coach for children ages 7-15. Personalized lessons that teach narrative, persuasive, expository, and descriptive writing.",
            }),
          }}
        />
      </head>
      <body
        className={`${nunito.variable} ${dmSans.variable} ${sora.variable} ${literata.variable} antialiased`}
      >
        <SessionProvider>
          <ActiveChildProvider>{children}</ActiveChildProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
