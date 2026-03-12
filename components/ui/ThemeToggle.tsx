"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
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
        variant="ghost"
        size="icon"
        className="relative size-8 shrink-0"
        onClick={() => setTheme(isDark ? "light" : "dark")}
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
