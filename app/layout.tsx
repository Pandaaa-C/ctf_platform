import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Nav from "./components/Nav";
import { eventMeta } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const ev = await eventMeta();
  return { title: ev.name, description: ev.tagline };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const ev = await eventMeta();
  return (
    <html lang="en">
      <body>
        <div className="banner">
          🚩 {ev.name} — submit the flags you capture to score points.
        </div>
        <Nav eventName={ev.name} />
        {children}
        <div className="foot">
          {ev.name} · scoreboard &amp; flag submission · built for a classroom CTF
        </div>
      </body>
    </html>
  );
}
