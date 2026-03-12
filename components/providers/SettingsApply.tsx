"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import {
  getAppSettings,
  ACCENT_PRIMARY,
  FONT_SIZE_PX,
  FONT_FAMILY_MAP,
} from "@/lib/settings";
import type { FontFamily } from "@/lib/settings";

function loadGoogleFont(familyId: FontFamily): void {
  const config = FONT_FAMILY_MAP[familyId];
  const googleId = config?.googleId ?? "Inter";
  const familyParam = googleId.replace(/\s/g, "+");
  const href = `https://fonts.googleapis.com/css2?family=${familyParam}:wght@400;500;600;700&display=swap`;
  let link = document.querySelector<HTMLLinkElement>(
    `link[data-app-font="${familyId}"]`
  );
  if (!link) {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.setAttribute("data-app-font", familyId);
    document.head.appendChild(link);
  }
}

export function SettingsApply() {
  const { setTheme } = useTheme();

  useEffect(() => {
    const s = getAppSettings();
    setTheme(s.theme);
    document.documentElement.style.setProperty(
      "--primary",
      ACCENT_PRIMARY[s.accentColor]
    );
    document.documentElement.style.fontSize = `${FONT_SIZE_PX[s.fontSize]}px`;
    document.body.setAttribute("data-density", s.tableDensity);
    loadGoogleFont(s.fontFamily);
    const fontName = FONT_FAMILY_MAP[s.fontFamily]?.name ?? "Inter";
    document.documentElement.style.setProperty(
      "--font-sans",
      `"${fontName}", ui-sans-serif, system-ui, sans-serif`
    );
  }, [setTheme]);

  return null;
}
