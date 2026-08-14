import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="
        flex h-9 w-9 items-center justify-center
        rounded-xl
        border border-slate-200
        bg-white
        text-slate-600
        transition
        hover:bg-slate-50
        dark:border-neutral-700
        dark:bg-neutral-800
        dark:text-neutral-300
        dark:hover:bg-neutral-700
      "
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </button>
  );
}