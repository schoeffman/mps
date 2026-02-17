import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

interface Project {
  id: number;
  name: string;
}

interface ColumnProjectPickerProps {
  label: string;
  projects: Project[];
  projectChipColorMap: Map<number, string>;
  onSelectProject: (projectId: number | null) => void;
}

export function ColumnProjectPicker({
  label,
  projects,
  projectChipColorMap,
  onSelectProject,
}: ColumnProjectPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors cursor-pointer"
        title="Assign project to entire column"
      >
        {label}
        <ChevronDown className="size-3 opacity-50" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed min-w-[180px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95"
            style={{ top: menuPos.top, left: menuPos.left, zIndex: 9999 }}
          >
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              Fill entire column
            </div>
            {projects.map((p) => {
              const chipColor = projectChipColorMap.get(p.id) ?? "";
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelectProject(p.id);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                >
                  <span className={`inline-block w-3 h-3 rounded-sm border ${chipColor}`} />
                  {p.name}
                </button>
              );
            })}
            <div className="h-px bg-border my-1" />
            <button
              onClick={() => {
                onSelectProject(null);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-muted-foreground"
            >
              <span className="inline-block w-3 h-3 rounded-sm border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800" />
              Clear all
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
