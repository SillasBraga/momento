"use client";

import { useLayoutEffect } from "react";
import { getLevelTheme } from "@/lib/level-theme";

export function ThemeRootSync({ level }: { level: number }) {
  useLayoutEffect(() => {
    const properties = getLevelTheme(level).properties;
    if (!properties) return;

    const rootStyle = document.documentElement.style;
    for (const [name, value] of Object.entries(properties)) {
      rootStyle.setProperty(name, value);
    }

    return () => {
      for (const name of Object.keys(properties)) rootStyle.removeProperty(name);
    };
  }, [level]);

  return null;
}
