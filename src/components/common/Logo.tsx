import { FlaskConical } from "lucide-react";

interface LogoProps {
  light?: boolean;
}

export function Logo({ light = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          light
            ? "bg-white/10 text-white"
            : "bg-indigo-600 text-white"
        }`}
      >
        <FlaskConical className="h-[18px] w-[18px]" strokeWidth={2} />
      </div>

      <div className="flex flex-col">
        <span
          className={`text-[15px] font-semibold tracking-tight ${
            light ? "text-white" : "text-slate-950 dark:text-white"
          }`}
        >
          ThesisCrew
        </span>

        <span
          className={`text-[9px] font-medium uppercase tracking-[0.16em] ${
            light
              ? "text-slate-300"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          Research together
        </span>
      </div>
    </div>
  );
}