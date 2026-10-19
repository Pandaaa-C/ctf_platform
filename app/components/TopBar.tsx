import type { ReactNode } from "react";

function initials(name: string): string {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "::";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export default function TopBar({
  title,
  href = "/",
  children,
}: {
  title: string;
  href?: string;
  children?: ReactNode;
}) {
  return (
    <nav className="nav">
      <a href={href} className="brand">
        <span className="mark">{initials(title)}</span>
        {title}
      </a>
      <div className="right">{children}</div>
    </nav>
  );
}
