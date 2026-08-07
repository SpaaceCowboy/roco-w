"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Nav hover effect ported from titangatequity.com: on hover, each word's
 * letters "rotate" (last char → front) once per tick, cycling exactly
 * word.length times so they settle back into the original word. Cheap — only
 * rewrites textContent, no per-letter DOM nodes.
 *
 * Attach `ref` to the text element and `start` to the trigger's onMouseEnter.
 * Respects prefers-reduced-motion and can't retrigger mid-run.
 */
export function useLetterRotate<T extends HTMLElement = HTMLElement>(speed = 46) {
  const ref = useRef<T>(null);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    const el = ref.current;
    if (!el || busy.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    busy.current = true;
    const original = el.textContent ?? "";
    const words = (original.match(/\S+|\s+/g) ?? []).map((raw) => ({
      raw,
      done: 0,
      len: raw.trim().length,
    }));
    const maxLen = Math.max(0, ...words.map((w) => w.len));
    const rotate = (s: string) => (s.length < 2 ? s : s.slice(-1) + s.slice(0, -1));

    let ticks = 0;
    timer.current = setInterval(() => {
      for (const w of words) {
        if (w.len && w.done < w.len) {
          w.raw = rotate(w.raw);
          w.done++;
        }
      }
      el.textContent = words.map((w) => w.raw).join("");
      if (++ticks >= maxLen) {
        if (timer.current) clearInterval(timer.current);
        timer.current = null;
        el.textContent = original;
        busy.current = false;
      }
    }, speed);
  }, [speed]);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  return { ref, start };
}
