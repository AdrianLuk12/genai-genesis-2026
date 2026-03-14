"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { Button } from "./button";
import { Input } from "./input";

// ── Types ──

interface EditNameOptions {
  title: string;
  currentName: string;
}

interface EditScenarioOptions {
  title: string;
  currentName: string;
  currentDescription: string;
}

interface EditResult {
  name: string;
  description?: string;
}

type ModalState =
  | { mode: "closed" }
  | {
      mode: "name";
      closing: boolean;
      options: EditNameOptions;
    }
  | {
      mode: "scenario";
      closing: boolean;
      options: EditScenarioOptions;
    };

interface EditContextType {
  editName: (options: EditNameOptions) => Promise<string | null>;
  editScenario: (
    options: EditScenarioOptions
  ) => Promise<{ name: string; description: string } | null>;
}

// ── Context ──

const EditContext = createContext<EditContextType | null>(null);

export function useEditName() {
  const ctx = useContext(EditContext);
  if (!ctx) throw new Error("useEditName must be used within EditProvider");
  return ctx.editName;
}

export function useEditScenario() {
  const ctx = useContext(EditContext);
  if (!ctx)
    throw new Error("useEditScenario must be used within EditProvider");
  return ctx.editScenario;
}

// ── Provider ──

export function EditProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ModalState>({ mode: "closed" });
  const resolveRef = useRef<((value: EditResult | null) => void) | null>(null);

  const editName = useCallback(
    (options: EditNameOptions): Promise<string | null> => {
      return new Promise((resolve) => {
        resolveRef.current = (r) => resolve(r?.name ?? null);
        setState({ mode: "name", closing: false, options });
      });
    },
    []
  );

  const editScenario = useCallback(
    (
      options: EditScenarioOptions
    ): Promise<{ name: string; description: string } | null> => {
      return new Promise((resolve) => {
        resolveRef.current = (r) =>
          resolve(
            r ? { name: r.name, description: r.description ?? "" } : null
          );
        setState({ mode: "scenario", closing: false, options });
      });
    },
    []
  );

  const handleClose = useCallback((result: EditResult | null) => {
    setState((prev) =>
      prev.mode === "closed" ? prev : { ...prev, closing: true }
    );
    setTimeout(() => {
      resolveRef.current?.(result);
      setState({ mode: "closed" });
    }, 180);
  }, []);

  return (
    <EditContext.Provider value={{ editName, editScenario }}>
      {children}
      {state.mode === "name" && (
        <EditModal
          title={state.options.title}
          closing={state.closing}
          onSave={(r) => handleClose(r)}
          onCancel={() => handleClose(null)}
          initialName={state.options.currentName}
        />
      )}
      {state.mode === "scenario" && (
        <EditModal
          title={state.options.title}
          closing={state.closing}
          onSave={(r) => handleClose(r)}
          onCancel={() => handleClose(null)}
          initialName={state.options.currentName}
          initialDescription={state.options.currentDescription}
          showDescription
        />
      )}
    </EditContext.Provider>
  );
}

// ── Modal ──

function EditModal({
  title,
  closing,
  onSave,
  onCancel,
  initialName,
  initialDescription = "",
  showDescription = false,
}: {
  title: string;
  closing: boolean;
  onSave: (result: EditResult) => void;
  onCancel: () => void;
  initialName: string;
  initialDescription?: string;
  showDescription?: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    // Focus and select input text
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name: name.trim(), description: description.trim() });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/25 backdrop-blur-[6px] transition-opacity duration-200"
        style={{ opacity: closing ? 0 : 1 }}
        onClick={onCancel}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-sm mx-4 bg-card border border-border shadow-[0_8px_40px_rgba(0,0,0,0.1)]"
        style={{
          animation: closing
            ? "none"
            : "fade-in-scale 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
          opacity: closing ? 0 : 1,
          transform: closing ? "scale(0.97) translateY(4px)" : undefined,
          transition: closing
            ? "opacity 0.18s ease-out, transform 0.18s ease-out"
            : undefined,
        }}
      >
        {/* Decorative top line */}
        <div className="h-px w-full bg-warm-tan" />

        <form onSubmit={handleSubmit} className="p-6">
          {/* Title */}
          <h3 className="font-display font-bold text-base uppercase tracking-[0.12em] mb-4">
            {title}
          </h3>

          {/* Name field */}
          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Name
            </label>
            <Input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name"
              className="transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(201,181,156,0.15)]"
            />
          </div>

          {/* Description field (scenario mode) */}
          {showDescription && (
            <div className="space-y-1.5 mt-4">
              <label className="block text-xs uppercase tracking-wider text-muted-foreground font-medium">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="transition-shadow duration-200 focus:shadow-[0_0_0_3px_rgba(201,181,156,0.15)]"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
