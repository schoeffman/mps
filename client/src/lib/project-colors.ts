export interface ProjectColorOption {
  key: string;
  label: string;
  cellBg: string;
  chipBg: string;
  hex: string;
}

export const PROJECT_COLOR_OPTIONS: ProjectColorOption[] = [
  {
    key: "blue",
    label: "Blue",
    cellBg: "bg-blue-100 dark:bg-blue-900/40",
    chipBg: "bg-blue-200 dark:bg-blue-800 border-blue-400 dark:border-blue-600",
    hex: "#93c5fd",
  },
  {
    key: "green",
    label: "Green",
    cellBg: "bg-green-100 dark:bg-green-900/40",
    chipBg: "bg-green-200 dark:bg-green-800 border-green-400 dark:border-green-600",
    hex: "#86efac",
  },
  {
    key: "purple",
    label: "Purple",
    cellBg: "bg-purple-100 dark:bg-purple-900/40",
    chipBg: "bg-purple-200 dark:bg-purple-800 border-purple-400 dark:border-purple-600",
    hex: "#c4b5fd",
  },
  {
    key: "amber",
    label: "Amber",
    cellBg: "bg-amber-100 dark:bg-amber-900/40",
    chipBg: "bg-amber-200 dark:bg-amber-800 border-amber-400 dark:border-amber-600",
    hex: "#fcd34d",
  },
  {
    key: "rose",
    label: "Rose",
    cellBg: "bg-rose-100 dark:bg-rose-900/40",
    chipBg: "bg-rose-200 dark:bg-rose-800 border-rose-400 dark:border-rose-600",
    hex: "#fda4af",
  },
  {
    key: "cyan",
    label: "Cyan",
    cellBg: "bg-cyan-100 dark:bg-cyan-900/40",
    chipBg: "bg-cyan-200 dark:bg-cyan-800 border-cyan-400 dark:border-cyan-600",
    hex: "#67e8f9",
  },
  {
    key: "orange",
    label: "Orange",
    cellBg: "bg-orange-100 dark:bg-orange-900/40",
    chipBg: "bg-orange-200 dark:bg-orange-800 border-orange-400 dark:border-orange-600",
    hex: "#fdba74",
  },
  {
    key: "yellow",
    label: "Yellow",
    cellBg: "bg-yellow-100 dark:bg-yellow-900/40",
    chipBg: "bg-yellow-200 dark:bg-yellow-800 border-yellow-400 dark:border-yellow-600",
    hex: "#fde047",
  },
  {
    key: "teal",
    label: "Teal",
    cellBg: "bg-teal-100 dark:bg-teal-900/40",
    chipBg: "bg-teal-200 dark:bg-teal-800 border-teal-400 dark:border-teal-600",
    hex: "#5eead4",
  },
];

const colorMap = new Map(PROJECT_COLOR_OPTIONS.map((o) => [o.key, o]));
const defaultColor = PROJECT_COLOR_OPTIONS[0];

export function getProjectColor(key: string): ProjectColorOption {
  return colorMap.get(key) ?? defaultColor;
}
