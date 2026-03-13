"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface TableOfContentsProps {
  headings: Heading[];
}

export default function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-20% 0% -70% 0%" },
    );
    headings.forEach((h) => {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <div className="sticky top-6 bg-surface rounded-lg py-6 px-12 border border-border">
      <p className="text-xs font-semibold uppercase text-muted mb-3 tracking-wider">
        DANS CETTE FICHE
      </p>
      <nav>
        {headings.map((h) => {
          const isActive = activeId === h.id;
          if (h.level === 2) {
            return (
              <a
                key={h.id}
                href={`#${h.id}`}
                className={cn(
                  "text-sm py-1 block transition-colors",
                  isActive
                    ? "text-accent border-l-2 border-accent pl-2"
                    : "text-muted hover:text-text",
                )}
              >
                {h.text}
              </a>
            );
          }
          return (
            <a
              key={h.id}
              href={`#${h.id}`}
              className={cn(
                "text-sm py-1 block transition-colors",
                isActive
                  ? "text-accent border-l-2 border-accent pl-5"
                  : "text-muted hover:text-text pl-3",
              )}
            >
              {h.text}
            </a>
          );
        })}
      </nav>
    </div>
  );
}
