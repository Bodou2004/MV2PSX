import React from 'react';
import { RuntimeState, ArenaStats } from '../types/runtime.ts';
import { Database, HardDrive, RefreshCcw, ShieldCheck } from 'lucide-react';

interface ArenaTelemetryProps {
  runtimeState: RuntimeState;
}

export const ArenaTelemetry: React.FC<ArenaTelemetryProps> = ({ runtimeState }) => {
  const { arenas } = runtimeState;

  const renderArenaBar = (arena: ArenaStats, colorClass: string, desc: string, lifetime: string) => {
    const usedPct = Math.min(100, (arena.used / arena.capacity) * 100);
    const hwmPct = Math.min(100, (arena.highWaterMark / arena.capacity) * 100);

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-200">{arena.name}</span>
            <span className="text-[10px] text-slate-500 font-mono">[{lifetime}]</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {(arena.used / 1024).toFixed(1)} KB / {(arena.capacity / 1024).toFixed(0)} KB
          </span>
        </div>

        {/* Progress Bar with High-Water Mark */}
        <div className="relative w-full h-3 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
          {/* Active memory fill */}
          <div
            className={`h-full ${colorClass} transition-all duration-300`}
            style={{ width: `${usedPct}%` }}
          />

          {/* High Water Mark indicator line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10"
            style={{ left: `${hwmPct}%` }}
            title={`High-Water Mark: ${(arena.highWaterMark / 1024).toFixed(1)} KB`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate max-w-[280px]">{desc}</span>
          <span className="text-[10px] font-mono text-amber-400/90 whitespace-nowrap">
            Pico: {(arena.highWaterMark / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>
    );
  };

  const totalUsed =
    arenas.permanent.used +
    arenas.scene.used +
    arenas.map.used +
    arenas.scratch.used +
    arenas.io.used;

  const totalHwm =
    arenas.permanent.highWaterMark +
    arenas.scene.highWaterMark +
    arenas.map.highWaterMark +
    arenas.scratch.highWaterMark +
    arenas.io.highWaterMark;

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-950/60 border border-indigo-800/50 rounded-lg text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Presupuesto de RAM Principal (2 MB)</h3>
              <p className="text-xs text-slate-400">Gestión por Arenas lineales sin fragmentación (Sección 6.1)</p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-right">
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">RAM Usada en Vivo</div>
              <div className="text-lg font-mono font-bold text-slate-200">
                {(totalUsed / 1024).toFixed(1)} KB
                <span className="text-xs text-slate-500 font-normal ml-1">/ 2048 KB</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase tracking-wider">High-Water Mark Global</div>
              <div className="text-lg font-mono font-bold text-amber-400">
                {(totalHwm / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>
        </div>

        {/* Policy verification quote */}
        <div className="mt-4 flex items-start gap-2.5 text-xs text-slate-400 bg-slate-950/50 p-3 rounded-lg border border-slate-800/60">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-300">Garantía de diseño PS1:</strong> Cambiar de mapa ejecuta <code className="text-indigo-300 font-mono text-[11px]">arena_reset(&g_map_arena)</code> en O(1). No se liberan objetos individualmente ni existe acumulación de fugas de memoria.
          </div>
        </div>
      </div>

      {/* Arena Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {renderArenaBar(
          arenas.permanent,
          'bg-indigo-500',
          'Managers, bitset de switches, variables globales',
          'Vida: Todo el juego'
        )}
        {renderArenaBar(
          arenas.scene,
          'bg-cyan-500',
          'Recursos de UI, ventanas y estado de la escena',
          'Vida: Por Escena'
        )}
        {renderArenaBar(
          arenas.map,
          'bg-emerald-500',
          'MAP.BIN activo: capas de tiles, pasabilidad y eventos',
          'Vida: Por Mapa'
        )}
        {renderArenaBar(
          arenas.scratch,
          'bg-amber-500',
          'Búfer efímero por fotograma para cálculos y ordenamiento',
          'Vida: 1 Frame'
        )}
      </div>

      {/* IO Streaming Arena */}
      {renderArenaBar(
        arenas.io,
        'bg-purple-500',
        'Búfer de lectura de sectores de CD-ROM para streaming de assets',
        'Vida: Lectura CD'
      )}
    </div>
  );
};
