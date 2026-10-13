import React, { useState } from 'react';
import { CompiledMapBinary } from '../../tools/mv2psx/ir/types.ts';
import { Binary, FileText, CheckCircle2 } from 'lucide-react';

interface BinaryHexViewerProps {
  maps: Map<number, CompiledMapBinary>;
}

export const BinaryHexViewer: React.FC<BinaryHexViewerProps> = ({ maps }) => {
  const mapIds = Array.from(maps.keys());
  const [selectedMapId, setSelectedMapId] = useState<number>(mapIds[0] || 1);

  const activeMap = maps.get(selectedMapId);

  // Format first 512 bytes as hex dump
  const formatHexDump = (buffer: Uint8Array, maxBytes = 512) => {
    const lines: { offset: string; hex: string; ascii: string }[] = [];
    const limit = Math.min(buffer.length, maxBytes);

    for (let i = 0; i < limit; i += 16) {
      const offset = i.toString(16).padStart(4, '0').toUpperCase();
      const chunk = buffer.slice(i, Math.min(i + 16, limit));

      const hexParts: string[] = [];
      let ascii = '';

      for (let j = 0; j < 16; j++) {
        if (j < chunk.length) {
          const byte = chunk[j];
          hexParts.push(byte.toString(16).padStart(2, '0').toUpperCase());
          ascii += byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.';
        } else {
          hexParts.push('  ');
          ascii += ' ';
        }
      }

      lines.push({
        offset,
        hex: hexParts.join(' '),
        ascii,
      });
    }

    return lines;
  };

  const hexLines = activeMap ? formatHexDump(activeMap.buffer) : [];

  return (
    <div className="space-y-4">
      {/* Selector & Header info */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/50 rounded-lg text-emerald-400">
              <Binary className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Inspector de Binarios (MAP.BIN - MVM1)</h3>
              <p className="text-xs text-slate-400">Verificación de encabezados empaquetados y offsets directos (Sección 7.1)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Seleccionar Mapa:</span>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {mapIds.map((id) => (
                <button
                  key={id}
                  onClick={() => setSelectedMapId(id)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    selectedMapId === id
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  MAP{id.toString().padStart(3, '0')}.BIN
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MapHeader Structured Inspection (Section 7.1) */}
        {activeMap && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Encabezado MapHeader Decodificado (38 bytes)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">MAGIC / VERSION</div>
                <div className="text-emerald-400 font-bold mt-0.5">
                  "{activeMap.header.magic}" (v{activeMap.header.version})
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">DIMENSIONES</div>
                <div className="text-slate-200 font-bold mt-0.5">
                  {activeMap.header.width} × {activeMap.header.height} tiles ({activeMap.header.layerCount} capas)
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">EVENTOS / CADENAS</div>
                <div className="text-slate-200 font-bold mt-0.5">
                  {activeMap.header.eventCount} eventos · {activeMap.strings.length} textos
                </div>
              </div>
              <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">TAMAÑO DE ARCHIVO</div>
                <div className="text-slate-200 font-bold mt-0.5">
                  {activeMap.header.fileSize} bytes ({(activeMap.header.fileSize / 1024).toFixed(2)} KB)
                </div>
              </div>
            </div>

            {/* Offsets Breakdown */}
            <div className="mt-2.5 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/50 p-2.5 rounded border border-slate-800/60">
              <div>tile_data_off: <span className="text-indigo-400">0x{activeMap.header.tileDataOff.toString(16)}</span></div>
              <div>pass_data_off: <span className="text-indigo-400">0x{activeMap.header.passDataOff.toString(16)}</span></div>
              <div>event_table_off: <span className="text-indigo-400">0x{activeMap.header.eventTableOff.toString(16)}</span></div>
              <div>strings_off: <span className="text-indigo-400">0x{activeMap.header.stringsOff.toString(16)}</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Hex Dump Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-300">Volcado Hexadecimal (Primeros 512 bytes)</h4>
          <span className="text-[10px] text-slate-500 font-mono">Direccionamiento little-endian PS1</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs overflow-x-auto leading-relaxed select-text">
          <div className="grid grid-cols-[60px_1fr_180px] text-slate-500 text-[11px] border-b border-slate-800 pb-1 mb-1">
            <span>OFFSET</span>
            <span>00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F</span>
            <span>ASCII</span>
          </div>
          {hexLines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-[60px_1fr_180px] hover:bg-slate-900/80">
              <span className="text-slate-600">{line.offset}</span>
              <span className="text-indigo-300">{line.hex}</span>
              <span className="text-slate-400 font-sans">{line.ascii}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
