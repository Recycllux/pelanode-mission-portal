import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useEvents, useMission, useReplay, useReplayControl } from "@/hooks/use-mission";
import { fmtDuration, fmtUtc, reviewTone } from "@/lib/pn-format";
import { EventGlyph } from "./chips";

export const SPEEDS = [
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
  { value: 5, label: "5×" },
  { value: 100, label: "Demo (100×)" },
];

export function TimeBar({ onSelectEvent }: { onSelectEvent?: (id: string) => void }) {
  const { data: replay } = useReplay();
  const { data: mission } = useMission();
  const { data: events = [] } = useEvents();
  const ctl = useReplayControl();
  const [drag, setDrag] = useState<number | null>(null);

  const start = mission ? Date.parse(mission.planned_start) : 0;
  const end = mission ? Date.parse(mission.planned_end) : 1;
  const now = replay ? Date.parse(replay.mission_time) : start;
  useEffect(() => setDrag(null), [replay?.mission_time]);
  const value = drag ?? now;
  const state = replay?.state ?? "idle";

  return (
    <div className="no-print flex items-center gap-4 border-t bg-card px-6 py-3 shadow-[0_-2px_8px_-4px] shadow-navy/20">
      <div className="flex items-center gap-2">
        {state === "running" ? (
          <Button size="lg" variant="secondary" onClick={() => ctl.mutate({ action: "pause" })} className="w-32">
            <Pause aria-hidden /> Pause
          </Button>
        ) : state === "paused" ? (
          <Button size="lg" onClick={() => ctl.mutate({ action: "resume" })} className="w-32">
            <Play aria-hidden /> Resume
          </Button>
        ) : (
          <Button size="lg" onClick={() => ctl.mutate({ action: "start" })} className="w-32">
            {state === "ended" ? <RotateCcw aria-hidden /> : <Play aria-hidden />} {state === "ended" ? "Restart" : "Start"}
          </Button>
        )}
        {state === "paused" && (
          <Button size="lg" variant="outline" onClick={() => ctl.mutate({ action: "start" })} aria-label="Restart from beginning">
            <RotateCcw aria-hidden />
          </Button>
        )}
        <Select value={String(replay?.speed ?? 100)} onValueChange={(v) => ctl.mutate({ action: "speed", speed: Number(v) })}>
          <SelectTrigger className="h-10 w-40" aria-label="Replay speed">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPEEDS.map((s) => (
              <SelectItem key={s.value} value={String(s.value)}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative flex-1 px-1 pt-5">
        <div className="pointer-events-none absolute inset-x-1 top-0 h-5">
          {events.map((e) => {
            const pct = ((Date.parse(e.captured_at) - start) / (end - start)) * 100;
            return (
              <button
                key={e.event_id}
                type="button"
                title={`${e.event_id} · ${fmtUtc(e.captured_at, false)}`}
                onClick={() => onSelectEvent?.(e.event_id)}
                className="pointer-events-auto absolute -translate-x-1/2"
                style={{ left: `${pct}%` }}
              >
                <EventGlyph perspective={e.perspective} tone={reviewTone(e)} confidence={e.confidence} size={16} />
              </button>
            );
          })}
        </div>
        <Slider
          min={start}
          max={end}
          step={1000}
          value={[value]}
          onValueChange={([v]) => setDrag(v ?? null)}
          onValueCommit={([v]) => v !== undefined && ctl.mutate({ action: "seek", to: new Date(v).toISOString() })}
          aria-label="Mission time scrubber"
        />
        <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular">
          <span>{mission ? fmtUtc(mission.planned_start, false) : ""}</span>
          <span>{mission ? fmtUtc(mission.planned_end, false) : ""}</span>
        </div>
      </div>

      <div className="min-w-56 text-right">
        <div className="text-2xl font-bold tabular">{fmtUtc(new Date(value).toISOString())}</div>
        <div className="text-xs text-muted-foreground tabular">
          T+{fmtDuration(value - start)} / {fmtDuration(end - start)} · <span className="font-semibold uppercase">{state}</span> · replayed
        </div>
      </div>
    </div>
  );
}
