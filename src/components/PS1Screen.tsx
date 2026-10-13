import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PS1RuntimeEmulator } from '../engine/ps1_emulator.ts';
import { RuntimeState } from '../types/runtime.ts';
import { Monitor, RefreshCw, Zap, Play, Square } from 'lucide-react';

interface PS1ScreenProps {
  emulator: PS1RuntimeEmulator;
  runtimeState: RuntimeState;
  onStateUpdate: (state: RuntimeState) => void;
}

export const PS1Screen: React.FC<PS1ScreenProps> = ({
  emulator,
  runtimeState,
  onStateUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crtFilter, setCrtFilter] = useState(false);
  const [isRunning, setIsRunning] = useState(true);

  // Joypad input state
  const padRef = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    action: false,
  });

  // Handle keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let handled = true;
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          padRef.current.up = true;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          padRef.current.down = true;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          padRef.current.left = true;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          padRef.current.right = true;
          break;
        case ' ':
        case 'x':
        case 'X':
        case 'Enter':
          padRef.current.action = true;
          break;
        default:
          handled = false;
      }
      if (handled) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          padRef.current.up = false;
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          padRef.current.down = false;
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          padRef.current.left = false;
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          padRef.current.right = false;
          break;
        case ' ':
        case 'x':
        case 'X':
        case 'Enter':
          padRef.current.action = false;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main 60 FPS Emulation Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = () => {
      if (isRunning && canvasRef.current) {
        emulator.handleInput(padRef.current);
        emulator.update();

        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          emulator.render(ctx);
        }

        onStateUpdate(emulator.getState());
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [emulator, isRunning, onStateUpdate]);

  const handleReset = () => {
    emulator.boot(1, 9, 10);
    onStateUpdate(emulator.getState());
  };

  const setPadButton = useCallback((btn: 'up' | 'down' | 'left' | 'right' | 'action', pressed: boolean) => {
    padRef.current[btn] = pressed;
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Top Console Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between text-xs text-slate-400 px-2">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">PS1 NTSC Target</span>
          <span>·</span>
          <span>320 × 240 @ 60 Hz</span>
          <span>·</span>
          <span>Buffer: <span className="font-mono text-emerald-400">{runtimeState.activeBuffer}</span></span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCrtFilter(!crtFilter)}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              crtFilter ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            Scanlines
          </button>
          <button
            onClick={handleReset}
            className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
            title="Reset Virtual PS1 Hardware"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="px-2.5 py-1 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
          >
            {isRunning ? <Square className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            {isRunning ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Screen Frame */}
      <div className="relative p-3 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-2xl">
        <div className="relative rounded-lg overflow-hidden bg-black shadow-inner border border-slate-950">
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            className="w-[640px] h-[480px] max-w-full aspect-[4/3] block image-render-pixelated cursor-crosshair"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* CRT scanlines effect */}
          {crtFilter && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.75) 50%)',
                backgroundSize: '100% 4px',
              }}
            />
          )}

          {/* Subtle vignette */}
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_30px_rgba(0,0,0,0.6)]" />
        </div>

        {/* Console brand tag */}
        <div className="flex items-center justify-between mt-2.5 px-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest text-slate-300">PlayStation</span>
            <span className="text-slate-500">|</span>
            <span className="font-mono text-slate-400">Map {runtimeState.currentMapId === 1 ? '001 (Aldea)' : '002 (Santuario)'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Pos: <span className="font-mono text-slate-300">{runtimeState.player.x}, {runtimeState.player.y}</span></span>
            <span>Switch 1: <span className={`font-mono font-bold ${runtimeState.switches[1] ? 'text-emerald-400' : 'text-slate-500'}`}>{runtimeState.switches[1] ? 'ON' : 'OFF'}</span></span>
          </div>
        </div>
      </div>

      {/* Virtual D-Pad and Controller */}
      <div className="w-full max-w-2xl bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-6">
        {/* D-Pad Controls */}
        <div className="flex items-center gap-2">
          <div className="grid grid-cols-3 gap-1.5 w-28 h-28">
            <div />
            <button
              onMouseDown={() => setPadButton('up', true)}
              onMouseUp={() => setPadButton('up', false)}
              onTouchStart={() => setPadButton('up', true)}
              onTouchEnd={() => setPadButton('up', false)}
              className="bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 rounded flex items-center justify-center text-slate-200 transition-colors font-mono text-xs"
            >
              ▲
            </button>
            <div />
            <button
              onMouseDown={() => setPadButton('left', true)}
              onMouseUp={() => setPadButton('left', false)}
              onTouchStart={() => setPadButton('left', true)}
              onTouchEnd={() => setPadButton('left', false)}
              className="bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 rounded flex items-center justify-center text-slate-200 transition-colors font-mono text-xs"
            >
              ◀
            </button>
            <div className="bg-slate-950 rounded border border-slate-800 flex items-center justify-center text-[10px] text-slate-600 font-mono">
              PAD
            </div>
            <button
              onMouseDown={() => setPadButton('right', true)}
              onMouseUp={() => setPadButton('right', false)}
              onTouchStart={() => setPadButton('right', true)}
              onTouchEnd={() => setPadButton('right', false)}
              className="bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 rounded flex items-center justify-center text-slate-200 transition-colors font-mono text-xs"
            >
              ▶
            </button>
            <div />
            <button
              onMouseDown={() => setPadButton('down', true)}
              onMouseUp={() => setPadButton('down', false)}
              onTouchStart={() => setPadButton('down', true)}
              onTouchEnd={() => setPadButton('down', false)}
              className="bg-slate-800 hover:bg-slate-700 active:bg-indigo-600 rounded flex items-center justify-center text-slate-200 transition-colors font-mono text-xs"
            >
              ▼
            </button>
            <div />
          </div>

          <div className="text-xs text-slate-400 pl-2">
            <div className="font-medium text-slate-300">Controles de Teclado</div>
            <div className="mt-1 space-y-0.5">
              <div><span className="font-mono text-slate-300 bg-slate-800 px-1 rounded">WASD / Flechas</span> Moverse</div>
              <div><span className="font-mono text-slate-300 bg-slate-800 px-1 rounded">Espacio / X</span> Acción / Hablar</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1">
            <button
              onMouseDown={() => setPadButton('action', true)}
              onMouseUp={() => setPadButton('action', false)}
              onTouchStart={() => setPadButton('action', true)}
              onTouchEnd={() => setPadButton('action', false)}
              className="w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-lg shadow-lg flex items-center justify-center transition-transform active:scale-95"
            >
              ✕
            </button>
            <span className="text-[11px] text-slate-400 font-mono">Cruz (Acción)</span>
          </div>

          <div className="flex flex-col items-center gap-1 opacity-60">
            <button
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-lg flex items-center justify-center"
            >
              ○
            </button>
            <span className="text-[11px] text-slate-400 font-mono">Círculo (Menú)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
