export type SimpleStatus = "neutral" | "stale" | "working" | "success" | "warning" | "failure";

/** Needs to match CSS, but currently easier to set in code. */
export function borderForStatus(st: SimpleStatus) {
  switch (st) {
    case "failure":
      return "1px solid oklch(0.5654 0.26 27.77)";
    case "success":
      return "1px solid oklch(0.5654 0.1835 262.86)";
    case "warning":
      return "1px solid oklch(0.6409 0.1251 100)";
    case "working":
    case "stale":
    case "neutral":
      return "1px solid oklch(0.5654 0 0)";
  }
}
