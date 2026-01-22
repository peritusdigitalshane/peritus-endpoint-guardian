import { useState, useEffect } from "react";

const TIMEZONE_KEY = "user-timezone";

// Common timezones grouped by region
export const TIMEZONE_OPTIONS = [
  { label: "UTC", value: "UTC" },
  // Australia
  { label: "Australia/Sydney (AEDT)", value: "Australia/Sydney" },
  { label: "Australia/Melbourne (AEDT)", value: "Australia/Melbourne" },
  { label: "Australia/Brisbane (AEST)", value: "Australia/Brisbane" },
  { label: "Australia/Perth (AWST)", value: "Australia/Perth" },
  { label: "Australia/Adelaide (ACDT)", value: "Australia/Adelaide" },
  // Americas
  { label: "America/New_York (EST)", value: "America/New_York" },
  { label: "America/Chicago (CST)", value: "America/Chicago" },
  { label: "America/Denver (MST)", value: "America/Denver" },
  { label: "America/Los_Angeles (PST)", value: "America/Los_Angeles" },
  { label: "America/Toronto (EST)", value: "America/Toronto" },
  // Europe
  { label: "Europe/London (GMT)", value: "Europe/London" },
  { label: "Europe/Paris (CET)", value: "Europe/Paris" },
  { label: "Europe/Berlin (CET)", value: "Europe/Berlin" },
  { label: "Europe/Amsterdam (CET)", value: "Europe/Amsterdam" },
  // Asia
  { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Asia/Singapore (SGT)", value: "Asia/Singapore" },
  { label: "Asia/Hong_Kong (HKT)", value: "Asia/Hong_Kong" },
  { label: "Asia/Dubai (GST)", value: "Asia/Dubai" },
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
  // Pacific
  { label: "Pacific/Auckland (NZDT)", value: "Pacific/Auckland" },
  { label: "Pacific/Fiji (FJT)", value: "Pacific/Fiji" },
];

export function useTimezone() {
  const [timezone, setTimezoneState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(TIMEZONE_KEY);
      if (saved) return saved;
      // Default to browser's timezone
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return "UTC";
  });

  useEffect(() => {
    localStorage.setItem(TIMEZONE_KEY, timezone);
  }, [timezone]);

  const setTimezone = (tz: string) => {
    setTimezoneState(tz);
  };

  const formatInTimezone = (date: Date | string, formatStr: string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: formatStr.includes("yyyy") ? "numeric" : undefined,
      month: formatStr.includes("MMM") ? "short" : formatStr.includes("MM") ? "2-digit" : undefined,
      day: formatStr.includes("d") ? "numeric" : undefined,
      hour: formatStr.includes("HH") ? "2-digit" : undefined,
      minute: formatStr.includes("mm") ? "2-digit" : undefined,
      second: formatStr.includes("ss") ? "2-digit" : undefined,
      hour12: false,
    }).format(d);
  };

  const formatDatetime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  };

  const formatFullDatetime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  };

  return {
    timezone,
    setTimezone,
    formatInTimezone,
    formatDatetime,
    formatFullDatetime,
  };
}
