import React, { useState } from 'react';
import { RuntimeState, VRAMRegion } from '../types/runtime.ts';
import { Layers, Eye, Info } from 'lucide-react';

interface VRAMInspectorProps {
  runtimeState: RuntimeState;
}

export const VRAMInspector: React.FC<VRAMInspectorProps> = ({ runtimeState }) => {
  const [selectedRegion, setSelectedRegion] = useState<VRAMRegion | null>(null);

  // VRAM Map Regions (1024 x 512 total space, 16-bit units)
  const regions: VRAMRegion[] = [
    {
      name: 'Framebuffer A (Display / Draw)',
      x: 0,
      y: 0,
      w: 320,
      h: 240,
      bpp: 16,
      desc: 'Framebuffer principal 16bpp (320x240). Alterna con Framebuffer B en double-buffering.',
      color: runtimeState.activeBuffer === 'A' ? 'bg-emerald-600/60 border-emerald-400' : 'bg-emerald-950/60 border-emerald-700/60',
    },
    {
      name: 'Framebuffer B (Display / Draw)',
      x: 0,
      y: 240,
      w: 320,
      h: 240,
      bpp: 16,
      desc: 'Segundo framebuffer 16bpp (320x240). Permite presentar frames sin tearing de pantalla.',
      color: runtimeState.activeBuffer === 'B' ? 'bg-emerald-600/60 border-emerald-400' : 'bg-emerald-950/60 border-emerald-700/60',
    },
    {
      name: 'Texture Page 0 (Tileset Atlas)',
      x: 320,
      y: 0,
      w: 256,
      h: 256,
      bpp: 8,
      desc: 'Página de texturas en 8bpp para el tileset del mapa actual. Creada offline por el image_pipeline.',
      color: 'bg-indigo-900/60 border-indigo-500/70',
    },
    {
      name: 'Texture Page 1 (Character Sprites)',
      x: 320,
      y: 256,
      w: 256,
      h: 256,
      bpp: 8,
      desc: 'Atlas de sprites para el héroe y los eventos/NPCs visibles en la escena (4 direcciones y pasos).',
      color: 'bg-cyan-900/60 border-cyan-500/70',
    },
    {
      name: 'Texture Page 2 (UI, Windows & Font Atlas)',
      x: 576,
      y: 0,
      w: 256,
      h: 256,
      bpp: 4,
      desc: 'Glifos bitmap rasterizados y bordes de ventanas de diálogo optimizados a 4bpp.',
      color: 'bg-amber-900/60 border-amber-500/70',
    },
    {
      name: 'CLUT / Palettes Area',
      x: 832,
      y: 0,
      w: 192,
      h: 64,
      bpp: 16,
      desc: 'Tablas de búsqueda de color (CLUT) en formato 16bpp (BGR555) compartidas entre texturas de 4bpp y 8bpp.',
      color: 'bg-rose-900/60 border-rose-500/70',
    },
    {
      name: 'Área Libre / VRAM Disponible',
      x: 576,
      y: 256,
      w: 448,
      h: 256,
      bpp: 8,
      desc: 'Espacio de reserva para battle assets, imágenes dinámicas y buffers de descompresión.',
      color: 'bg-slate-900/40 border-dashed border-slate-700/60',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/60 border border-cyan-800/50 rounded-lg text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Mapa de VRAM PS1 (1 MB / 1024 × 512)</h3>
            <p className="text-xs text-slate-400">Distribución física de Framebuffers, Texturas y CLUTs (Secciones 2.2 y 8.2)</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm bg-emerald-600 border border-emerald-400 inline-block" />
            <span className="text-slate-300">Buffer Activo: <strong className="font-mono text-emerald-400">{runtimeState.activeBuffer}</strong></span>
          </div>
          <div className="text-slate-500">|</div>
          <div className="text-slate-400">
            VRAM Ocupada Estimada: <strong className="font-mono text-slate-200">~628 KB / 1024 KB (61%)</strong>
          </div>
        </div>
      </div>

      {/* Interactive VRAM Graphic (1024 x 512 aspect ratio 2:1) */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center">
        <div className="relative w-full max-w-4xl aspect-[2/1] bg-slate-950 border border-slate-900 rounded overflow-hidden select-none">
          {/* Subtle grid lines */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Render regions */}
          {regions.map((region) => {
            const leftPct = (region.x / 1024) * 100;
            const topPct = (region.y / 512) * 100;
            const widthPct = (region.w / 1024) * 100;
            const heightPct = (region.h / 512) * 100;
            const isSelected = selectedRegion?.name === region.name;

            return (
              <div
                key={region.name}
                onClick={() => setSelectedRegion(region)}
                className={`absolute border cursor-pointer transition-all duration-200 flex flex-col justify-between p-1.5 overflow-hidden ${region.color} ${
                  isSelected ? 'ring-2 ring-indigo-400 z-20' : 'hover:opacity-90 z-10'
                }`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${widthPct}%`,
                  height: `${heightPct}%`,
                }}
              >
                <div className="text-[10px] font-mono font-semibold text-slate-100 truncate">
                  {region.name}
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-300">
                  <span>{region.w}×{region.h}</span>
                  <span className="opacity-80">{region.bpp} bpp</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Region Detail */}
        <div className="w-full max-w-4xl mt-3 p-3 bg-slate-900/90 border border-slate-800 rounded-lg text-xs text-slate-300 flex items-start justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-slate-100">
                {selectedRegion ? selectedRegion.name : 'Haz clic en una región de la VRAM para inspeccionarla'}
              </div>
              <div className="text-slate-400 mt-0.5">
                {selectedRegion
                  ? selectedRegion.desc
                  : 'La PlayStation 1 comparte el megabyte de memoria gráfica entre la pantalla que se está dibujando, la que se está mostrando, las texturas y las paletas CLUT.'}
              </div>
            </div>
          </div>

          {selectedRegion && (
            <div className="text-right font-mono text-[11px] text-slate-400 shrink-0">
              <div>Coords: ({selectedRegion.x}, {selectedRegion.y})</div>
              <div>Profundidad: {selectedRegion.bpp} bpp</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
