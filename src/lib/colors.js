// Colors an event can have on the calendar.
export const EVENT_COLORS = [
  { value: "", name: "Maroon (default)", hex: "#8e1b1b" },
  { value: "#c2571a", name: "Orange", hex: "#c2571a" },
  { value: "#b8860b", name: "Gold", hex: "#b8860b" },
  { value: "#2e7d4f", name: "Green", hex: "#2e7d4f" },
  { value: "#0f7c8a", name: "Teal", hex: "#0f7c8a" },
  { value: "#2b4c86", name: "Blue", hex: "#2b4c86" },
  { value: "#6a3d9a", name: "Purple", hex: "#6a3d9a" },
  { value: "#b03a73", name: "Pink", hex: "#b03a73" },
  { value: "#4a4a4a", name: "Gray", hex: "#4a4a4a" },
];

const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || "");

// Style for an event chip: background color + readable text color.
export function eventChipStyle(color) {
  if (!isHex(color)) return undefined;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  const light = (0.299 * r + 0.587 * g + 0.114 * b) > 160;
  return { background: color, color: light ? "#1f1a17" : "#fff" };
}
