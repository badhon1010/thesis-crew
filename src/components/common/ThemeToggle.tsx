import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  
  const { theme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label="Toggle Theme"
      title="Toggle Theme"
      className="
        flex h-10 w-10 items-center justify-center
        rounded-xl
        border border-slate-200
        bg-white
        text-slate-600
        transition-colors
        hover:bg-slate-50
        dark:border-[#2A2A2A]
        dark:bg-[#121212]
        dark:text-slate-300
        dark:hover:bg-[#181818]
      "
    >
      {theme === "dark" ? (
        <Sun className="h-5 w-5 text-amber-500" />
      ) : (
        <Moon className="h-5 w-5 text-slate-600" />
      )}
    </button>
  );
}