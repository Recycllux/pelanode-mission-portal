import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { MissionMapProps } from "./MissionMap";

const MissionMap = lazy(() => import("./MissionMap"));

const Fallback = () => <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">Loading map…</div>;

export function LazyMap(props: MissionMapProps) {
  return (
    <ClientOnly fallback={<Fallback />}>
      <Suspense fallback={<Fallback />}>
        <MissionMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
