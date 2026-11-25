// Membership: the admin sets when it starts and when it ends (a new one is usually a year). Status is worked out from the end date.
import { daysBetween, todayKey } from "./dates.js";

export const SOON_DAYS = 30;

export function membershipOf(u, today = todayKey()) {
  if (!u?.membershipExpires) return { status: "none", label: "No membership" };
  const days = daysBetween(today, u.membershipExpires);
  if (days < 0) return { status: "expired", label: "Expired", days };
  if (days <= SOON_DAYS) return { status: "expiring", label: days === 0 ? "Expires today" : `Expires in ${days} day${days === 1 ? "" : "s"}`, days };
  return { status: "active", label: "Active", days };
}

export const fullName = (u) => `${u?.firstName || ""} ${u?.lastName || ""}`.trim();
export const initialsOf = (u) => `${(u?.firstName || "")[0] || ""}${(u?.lastName || "")[0] || ""}`.toUpperCase() || "?";
