import React from 'react';
import { BuildReport } from '../../tools/mv2psx/ir/types.ts';
import { Cpu, FileCode, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

interface ProjectCompilerViewProps {
  report: BuildReport;
}

export const ProjectCompilerView: React.FC<ProjectCompilerViewProps> = ({ report }) => {
  const { features, memoryReports, worstScene } = report;

  const featureList = [
    { name: 'MVPSX_USE_TEXT', enabled: features.useText, desc: 'Diálogos y ventanas de texto' },
    { name: 'MVPSX_USE_CHOICES', enabled: features.useChoices, desc: 'Selección de opciones de usuario' },
    { name: 'MVPSX_USE_SWITCHES', enabled: features.useSwitches, desc: 'Bitset global de interruptores' },
    { name: 'MVPSX_USE_VARIABLES', enabled: features.useVariables, desc: 'Arreglo int32 de variables de juego' },
    { name: 'MVPSX_USE_TRANSFER', enabled: features.useTransfer, desc: 'Transferencia y descarga de mapas' },
    { name: 'MVPSX_USE_PICTURES', enabled: features.usePictures, desc: 'Carga de imágenes en pantalla' },
    { name: 'MVPSX_USE_BATTLE', enabled: features.useBattle, desc: 'Subsistema de combate por turnos' },
    { name: 'MVPSX_USE_SHOP', enabled: features.useShop, desc: 'Tiendas e inventario de comercio' },
    { name: 'MVPSX_USE_AUDIO_SE', enabled: features.useAudioSe, desc: 'Efectos sonoros SPU/ADPCM' },
    { name: 'MVPSX_USE_AUDIO_BGM', enabled: features.useAudioBgm, desc: 'Música de fondo en streaming XA' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/80">
                COMPILACIÓN EXITOSA
              </span>
              <span className="text-xs text-slate-500 font-mono">Pipeline Offline PC</span>
            </div>
            <h3 className="text-lg font-bold text-slate-100 mt-1">{report.projectName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Generado el {new Date(report.timestamp).toLocaleString()} · {report.mapsCompiled} mapas compilados a binario
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-[11px] text-slate-500 uppercase">Escena Crítica (RAM)</div>
              <div className="text-sm font-mono font-bold text-slate-200">
                {worstScene.sceneName} ({(worstScene.totalEstimatedRamBytes / 1024).toFixed(0)} KB)
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-500 uppercase">Estado General</div>
              <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Apto para PS1
              </div>
            </div>
          </div>
        </div>

        {/* Feature Stripping Summary (Section 4.3 & 5.1) */}
        <div className="mt-4">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            Detección de Features & Link-Time Stripping
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            El runtime enlaza únicamente las bibliotecas estáticas requeridas por el proyecto para minimizar el tamaño residente en RAM.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono">
            {featureList.map((f) => (
              <div
                key={f.name}
                className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                  f.enabled
                    ? 'bg-indigo-950/40 border-indigo-800/60 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800/60 text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px]">{f.name.replace('MVPSX_USE_', '')}</span>
                  <span className={`text-[10px] px-1 rounded ${f.enabled ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-800 text-slate-400'}`}>
                    {f.enabled ? '1' : '0'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-sans mt-1 line-clamp-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Memory Reports per Scene (Section 17) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Reporte de Memoria por Escena (Sección 17)
        </h4>

        <div className="border border-slate-800 rounded-lg overflow-hidden text-xs font-mono">
          <table className="w-full text-left divide-y divide-slate-800">
            <thead className="bg-slate-950 text-slate-400 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Escena</th>
                <th className="py-2.5 px-3">Tiles (Capas)</th>
                <th className="py-2.5 px-3">Eventos + VM</th>
                <th className="py-2.5 px-3">RAM Estimada</th>
                <th className="py-2.5 px-3">VRAM Estimada</th>
                <th className="py-2.5 px-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/50">
              {memoryReports.map((item) => (
                <tr key={item.mapId} className="hover:bg-slate-850">
                  <td className="py-2 px-3 font-semibold text-slate-200 font-sans">
                    {item.sceneName}
                  </td>
                  <td className="py-2 px-3 text-slate-400">{(item.mapBytes / 1024).toFixed(1)} KB</td>
                  <td className="py-2 px-3 text-slate-400">{(item.eventsBytes / 1024).toFixed(1)} KB</td>
                  <td className="py-2 px-3 text-slate-200 font-bold">
                    {(item.totalEstimatedRamBytes / 1024).toFixed(1)} KB
                  </td>
                  <td className="py-2 px-3 text-slate-300">
                    {(item.estimatedVramBytes / 1024).toFixed(0)} KB
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                      <CheckCircle2 className="w-3 h-3" />
                      OK
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generated features.h View */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-violet-400" />
          Cabecera Generada: generated/features.h
        </h4>
        <pre className="bg-slate-950 text-indigo-300 p-4 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto leading-relaxed">
          {report.featuresHeader}
        </pre>
      </div>
    </div>
  );
};
