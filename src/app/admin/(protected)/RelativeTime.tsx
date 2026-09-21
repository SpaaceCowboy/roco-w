"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../admin.module.css";

function relativeLabel(date: Date, now: Date): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1_000);
  const ranges = [
    { unit: "year", seconds: 31_536_000 },
    { unit: "month", seconds: 2_592_000 },
    { unit: "day", seconds: 86_400 },
    { unit: "hour", seconds: 3_600 },
    { unit: "minute", seconds: 60 },
  ] as const;
  const range = ranges.find((candidate) => Math.abs(seconds) >= candidate.seconds);
  if (!range) return "Just now";
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(seconds / range.seconds), range.unit);
}

function exactLabel(date: Date): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function RelativeTime({ value }: { value: string }) {
  const date = useMemo(() => new Date(value), [value]);
  const [labels, setLabels] = useState({ relative: "Updated recently", exact: date.toISOString() });

  useEffect(() => {
    const update = () => setLabels({ relative: relativeLabel(date, new Date()), exact: exactLabel(date) });
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [date]);

  return <time className={styles.relativeTime} dateTime={value} title={labels.exact}>
    <span>{labels.relative}</span>
    <small>{labels.exact}</small>
  </time>;
}
