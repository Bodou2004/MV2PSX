/**
 * MV2PSX - RPG Maker MV to PlayStation 1 Compiler & Modular Runtime
 * Architecture Specification v0.1 Implementation
 */

import React, { useState, useMemo, useEffect } from 'react';
import { MV2PSXCompiler, CompilationResult } from '../tools/mv2psx/index.ts';
import { PS1RuntimeEmulator } from './engine/ps1_emulator.ts';
import { RuntimeState } from './types/runtime.ts';
import { PS1Screen } from './components/PS1Screen.tsx';
import { ArenaTelemetry } from './components/ArenaTelemetry.tsx';
import { VRAMInspector } from './components/VRAMInspector.tsx';
import { EventVMDebugger } from './components/EventVMDebugger.tsx';
import { ProjectCompilerView } from './components/ProjectCompilerView.tsx';
import { BinaryHexViewer } from './components/BinaryHexViewer.tsx';
import { SourceCodeExport } from './components/SourceCodeExport.tsx';

// Load initial vertical slice fixtures
import systemFixture from '../fixtures/vertical_slice/data/System.json';
import map001Fixture from '../fixtures/vertical_slice/data/Map001.json';
import map002Fixture from '../fixtures/vertical_slice/data/Map002.json';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'runtime' | 'compiler' | 'memory' | 'vram' | 'vm' | 'binary' | 'source'
  >('runtime');

  // Compile the initial project fixtures using MV2PSX Compiler
  const compilationResult = useMemo<CompilationResult>(() => {
    const compiler = new MV2PSXCompiler();
    return compiler.compileProject(
      systemFixture.gameTitle,
      systemFixture as any,
      [
        { id: 1, data: map001Fixture as any },
        { id: 2, data: map002Fixture as any },
      ]
    );
  }, []);

  // Instantiate the PS1 Runtime Emulator
  const emulator = useMemo(() => {
    const emu = new PS1RuntimeEmulator(compilationResult.maps);
    emu.boot(1, 9, 10);
    return emu;
  }, [compilationResult]);

  const [runtimeState, setRuntimeState] = useState<RuntimeState>(() => emulator.getState());

  const handleRecompile = () => {
    emulator.boot(1, 9, 10);
    setRuntimeState(emulator.getState());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Top Bar Contract (3 Zones, strictly one row) */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
            MV2PSX Studio
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/60">
            PSn00bSDK
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('runtime')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeTab === 'runtime'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            PS1 Runtime & Slice
          </button>
          <button
            onClick={() => setActiveTab('compiler')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeTab === 'compiler'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Compilador & Features
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeTab === 'memory'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Memoria & Arenas
          </button>
          <button
            onClick={() => setActiveTab('vram')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeTab === 'vram'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            VRAM 1MB
          </button>
          <button
            onClick={() => setActiveTab('vm')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeTab === 'vm'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Event VM Bytecode
          </button>
          <button
            onClick={() => setActiveTab('binary')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeTab === 'binary'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Hex MAP.BIN
          </button>
          <button
            onClick={() => setActiveTab('source')}
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              activeTab === 'source'
                ? 'text-white border-b-2 border-indigo-500 font-semibold'
                : 'hover:text-slate-200'
            }`}
          >
            Fuentes C
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRecompile}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shadow-sm"
          >
            Reiniciar Ejecución
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'runtime' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Screen Viewport & Pad Column */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <PS1Screen
                emulator={emulator}
                runtimeState={runtimeState}
                onStateUpdate={setRuntimeState}
              />
            </div>

            {/* Live Contextual Telemetry Sidebar */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                    Vertical Slice: M0 a M3 (Sección 21)
                  </h3>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                    ACTIVO
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-300 space-y-2.5">
                  <p>
                    Demostración de la cadena completa de arquitectura definida en el PDF:
                  </p>
                  <ul className="space-y-1.5 text-slate-400 pl-4 list-disc marker:text-indigo-400">
                    <li>
                      <strong className="text-slate-200">1. Carga de MAP001.BIN:</strong> Capas de tiles 20×15 y matriz de colisión empaquetada.
                    </li>
                    <li>
                      <strong className="text-slate-200">2. Culling de tiles:</strong> Dibuja únicamente la ventana visible de 320×240.
                    </li>
                    <li>
                      <strong className="text-slate-200">3. Event VM:</strong> Acércate al Sabio en (9, 7) y pulsa <span className="text-slate-200 font-mono">Espacio</span> para ver el diálogo con <code className="text-indigo-300">OP_TEXT</code> y activar Switch 1 con <code className="text-indigo-300">OP_SET_SWITCH</code>.
                    </li>
                    <li>
                      <strong className="text-slate-200">4. Transferencia:</strong> Cruza la puerta norte en (9, 1). Ejecuta <code className="text-indigo-300">OP_TRANSFER</code>, resetea <code className="text-indigo-300">g_map_arena</code> en O(1) y carga MAP002.BIN sin fugas.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Compact Quick Arenas Widget */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="font-semibold text-slate-300">Estado de Memoria RAM (En Vivo)</span>
                  <span className="font-mono text-amber-400 text-[11px]">
                    HWM: {(runtimeState.arenas.map.highWaterMark / 1024).toFixed(1)} KB (Map Arena)
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>g_map_arena (MAP.BIN activo)</span>
                      <span>{(runtimeState.arenas.map.used / 1024).toFixed(1)} KB / 512 KB</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-200"
                        style={{
                          width: `${(runtimeState.arenas.map.used / runtimeState.arenas.map.capacity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>g_perm_arena (Tablas globales)</span>
                      <span>{(runtimeState.arenas.permanent.used / 1024).toFixed(1)} KB / 128 KB</span>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-200"
                        style={{
                          width: `${(runtimeState.arenas.permanent.used / runtimeState.arenas.permanent.capacity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Event VM Status Widget */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-300">Última Instrucción VM</span>
                  <span className="font-mono text-violet-400 text-[11px]">
                    {runtimeState.eventVm.currentOpcodeName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span>Switch #1: <strong className={runtimeState.switches[1] ? 'text-emerald-400' : 'text-slate-500'}>{runtimeState.switches[1] ? 'ON (Desbloqueado)' : 'OFF (Bloqueado)'}</strong></span>
                  <span>PC: 0x{runtimeState.eventVm.pc.toString(16).padStart(4, '0')}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'compiler' && <ProjectCompilerView report={compilationResult.report} />}
        {activeTab === 'memory' && <ArenaTelemetry runtimeState={runtimeState} />}
        {activeTab === 'vram' && <VRAMInspector runtimeState={runtimeState} />}
        {activeTab === 'vm' && <EventVMDebugger runtimeState={runtimeState} />}
        {activeTab === 'binary' && <BinaryHexViewer maps={compilationResult.maps} />}
        {activeTab === 'source' && <SourceCodeExport />}
      </main>
    </div>
  );
}
