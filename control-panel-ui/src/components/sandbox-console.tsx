"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LogEntry {
  timestamp: number;
  type: "capture" | "replay" | "info" | "error";
  message: string;
}

interface SandboxConsoleProps {
  entries: LogEntry[];
  expanded: boolean;
  onToggle: () => void;
  unseenCount: number;
}

const TYPE_STYLES: Record<LogEntry["type"], string> = {
  error: "text-destructive",
  capture: "text-green-700",
  replay: "text-blue-700",
  info: "text-muted-foreground",
};

export function SandboxConsole({
  entries,
  expanded,
  onToggle,
  unseenCount,
}: SandboxConsoleProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, expanded]);

  return (
    <Card className="border-border overflow-hidden animate-fade-in-scale" style={{ animationDelay: "200ms" }}>
      <CardHeader
        className="pb-0 pt-0 cursor-pointer select-none border-b border-border/50 bg-secondary/30"
        onClick={onToggle}
      >
        <CardTitle className="text-xs font-mono text-muted-foreground flex items-center justify-between py-2">
          <span className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="size-3" />
            ) : (
              <ChevronRight className="size-3" />
            )}
            <span className="uppercase tracking-wider">Console</span>
            {unseenCount > 0 && (
              <span className="bg-warm-tan text-primary-foreground text-[10px] px-1.5 py-0.5 font-bold min-w-[18px] text-center">
                {unseenCount}
              </span>
            )}
          </span>
          <span>{entries.length} entries</span>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="p-0">
          <div className="h-48 overflow-y-auto font-mono text-xs p-3 space-y-px bg-secondary/20">
            {entries.length === 0 && (
              <p className="text-muted-foreground/50 py-4 text-center uppercase tracking-wider">
                No log entries yet
              </p>
            )}
            {entries.map((entry, i) => (
              <div key={i} className={`py-0.5 ${TYPE_STYLES[entry.type]}`}>
                <span className="text-muted-foreground/40">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>{" "}
                <span className="text-muted-foreground/60">[{entry.type}]</span>{" "}
                {entry.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
