"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useDemo } from "@/lib/store";
import { nowWall, type WallClock } from "@/lib/time";

const STORAGE_KEY = "kaelop-turnos-demo";

/**
 * Carga la demo del navegador (o la siembra) antes de mostrar nada.
 * También sincroniza pestañas: reservá en una y el panel de la otra se actualiza solo.
 */
export function DemoGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const ready = useDemo((s) => s.ready);

  useEffect(() => {
    let alive = true;
    Promise.resolve(useDemo.persist.rehydrate()).finally(() => alive && useDemo.getState().init());

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) void useDemo.persist.rehydrate();
    };
    const tick = setInterval(() => useDemo.getState().processQueue(), 30_000);
    window.addEventListener("storage", onStorage);
    return () => {
      alive = false;
      clearInterval(tick);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!ready) return <>{fallback ?? <GateSkeleton />}</>;
  return <>{children}</>;
}

function GateSkeleton() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3 text-sm text-subtle">
        <span className="size-2 animate-pulse rounded-full bg-accent" />
        Preparando la demo…
      </div>
    </div>
  );
}

/** Reloj del negocio que se refresca cada 30 s. */
export function useNow(): WallClock {
  const [now, setNow] = useState(nowWall);
  useEffect(() => {
    const id = setInterval(() => setNow(nowWall()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
