"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { setAppSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

// Narrow type for View Transitions API (avoid extending Document to prevent conflict with DOM lib)
type ViewTransitionDoc = {
  startViewTransition?(callback: () => void | Promise<void>): {
    ready: Promise<void>;
    finished: Promise<void>;
    updateCallbackDone: Promise<void>;
  };
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleToggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const next = resolvedTheme === "dark" ? "light" : "dark";

    const doc = document as unknown as ViewTransitionDoc;
    if (!doc.startViewTransition) {
      setTheme(next);
      setAppSettings({ theme: next });
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(next);
      return;
    }

    // Update DOM synchronously so the transition captures the new state without timeout.
    // classList is applied immediately; setTheme/setAppSettings keep next-themes and settings in sync.
    const transition = doc.startViewTransition(() => {
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.classList.add(next);
      setTheme(next);
      setAppSettings({ theme: next });
    });

    await transition.ready;

    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${endRadius}px at ${x}px ${y}px)`,
        ],
      },
      {
        duration: 400,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        pseudoElement: "::view-transition-new(root)",
      }
    );
  };

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        aria-label="Toggle theme"
      >
        <Sun className="size-4 opacity-0" aria-hidden />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip
      content={isDark ? "Switch to light mode" : "Switch to dark mode"}
      side="bottom"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-8 shrink-0"
        onClick={handleToggle}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        <span className="relative flex size-4 items-center justify-center">
          <Sun
            className={cn(
              "absolute size-4 transition-[opacity,transform] duration-200",
              isDark ? "scale-100 opacity-100" : "scale-0 opacity-0"
            )}
            aria-hidden
          />
          <Moon
            className={cn(
              "absolute size-4 transition-[opacity,transform] duration-200",
              isDark ? "scale-0 opacity-0" : "scale-100 opacity-100"
            )}
            aria-hidden
          />
        </span>
      </Button>
    </Tooltip>
  );
}
