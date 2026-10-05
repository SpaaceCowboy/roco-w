import { readFileSync } from "node:fs";

export type AvailabilitySchedule = {
  timezone: string;
  start: string;
  end: string;
  outsideHours: "silent_handoff" | "message_handoff";
};

function minutes(value: string): number {
  if (!/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
    throw new Error("Bot availability times must use HH:MM (00:00–23:59)");
  }
  const [hour, minute] = value.split(":").map(Number);
  return hour! * 60 + minute!;
}

export function validateAvailability(value: unknown): AvailabilitySchedule {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Bot availability must be an object");
  const schedule = value as Partial<AvailabilitySchedule>;
  if (Object.keys(schedule).some((key) => !["timezone", "start", "end", "outsideHours"].includes(key)) ||
    typeof schedule.timezone !== "string" || typeof schedule.start !== "string" || typeof schedule.end !== "string" ||
    (schedule.outsideHours !== "silent_handoff" && schedule.outsideHours !== "message_handoff")) {
    throw new Error("Bot availability requires timezone, start, end and outsideHours");
  }
  // Resolve using the runtime's IANA timezone database, never the server clock's zone.
  try { new Intl.DateTimeFormat("en-GB", { timeZone: schedule.timezone }); }
  catch { throw new Error("Bot availability timezone must be a valid IANA timezone"); }
  if (minutes(schedule.start) === minutes(schedule.end)) throw new Error("Bot availability start and end must differ");
  return schedule as AvailabilitySchedule;
}

export function loadAvailability(): AvailabilitySchedule {
  return validateAvailability(JSON.parse(readFileSync(new URL("../knowledge/availability.json", import.meta.url), "utf8")));
}

/** Daily interval: start inclusive, end exclusive; supports crossing midnight. */
export function isBotAvailable(schedule: AvailabilitySchedule, now = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: schedule.timezone, hourCycle: "h23", hour: "2-digit", minute: "2-digit",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) throw new Error("Unable to resolve bot availability time");
  const current = hour * 60 + minute;
  const start = minutes(schedule.start);
  const end = minutes(schedule.end);
  return start < end ? current >= start && current < end : current >= start || current < end;
}
