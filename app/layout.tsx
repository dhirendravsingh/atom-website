import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource-variable/manrope";
import "@fontsource-variable/newsreader/wght-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);

  return {
    metadataBase: baseUrl,
    title: "Atom — Nothing important slips through",
    description: "A voice-first, offline-first personal reminder assistant for Android. Speak naturally, keep reminders local, and get reliable Android alarms.",
    applicationName: "Atom",
    keywords: ["Atom", "reminder assistant", "Android reminders", "offline reminders", "voice reminders", "private reminder app"],
    authors: [{ name: "Atom" }],
    creator: "Atom",
    icons: {
      icon: "/atom-icon.svg",
      shortcut: "/atom-icon.svg",
      apple: "/atom-icon.png",
    },
    openGraph: {
      type: "website",
      url: "/",
      title: "Atom — Nothing important slips through",
      description: "Private reminder intelligence. Voice-first, offline-first, and built for reliable delivery on Android.",
      siteName: "Atom",
      images: [{ url: "/og.png", width: 1672, height: 941, alt: "Atom — Nothing important slips through" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Atom — Nothing important slips through",
      description: "Private reminder intelligence for Android.",
      images: ["/og.png"],
    },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#070b09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
