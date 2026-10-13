import React from 'react';
import { RuntimeState } from '../types/runtime.ts';
import { Cpu, ToggleLeft, ToggleRight, ArrowRight } from 'lucide-react';
import { OPCODES } from '../../tools/mv2psx/compilers/event_compiler.ts';

interface EventVMDebuggerProps {
  runtimeState: RuntimeState;
}

export const EventVMDebugger: React.FC<EventVMDebuggerProps> = ({ runtimeState }) => {
  const { eventVm, switches, variables } = runtimeState;

  // Disassemble bytecode instructions
  const disassemble = (code: Uint8Array) => {
    const instructions: { offset: number; hex: string; mnemonic: string; args: string }[] = [];
    let pc = 0;
    const view = new DataView(code.buffer, code.byteOffset, code.byteLength);

    while (pc < code.length) {
      const offset = pc;
      const op = code[pc++];
      let mnemonic = `UNKNOWN (0x${op.toString(16)})`;
      let args = '';
      const hexBytes = [op.toString(16).padStart(2, '0')];

      switch (op) {
        case OPCODES.END:
          mnemonic = 'OP_END';
          break;

        case OPCODES.TEXT: {
          mnemonic = 'OP_TEXT';
          if (pc + 2 <= code.length) {
            const strId = view.getUint16(pc, true);
            hexBytes.push(code[pc].toString(16).padStart(2, '0'));
            hexBytes.push(code[pc + 1].toString(16).padStart(2, '0'));
            pc += 2;
            args = `string_id=0x${strId.toString(16).padStart(4, '0')} (${strId})`;
          }
          break;
        }

        case OPCODES.SET_SWITCH: {
          mnemonic = 'OP_SET_SWITCH';
          if (pc + 3 <= code.length) {
            const swId = view.getUint16(pc, true);
            const val = code[pc + 2];
            hexBytes.push(code[pc].toString(16).padStart(2, '0'));
            hexBytes.push(code[pc + 1].toString(16).padStart(2, '0'));
            hexBytes.push(val.toString(16).padStart(2, '0'));
            pc += 3;
            args = `id=${swId}, value=${val === 1 ? 'ON' : 'OFF'}`;
          }
          break;
        }

        case OPCODES.SET_VAR: {
          mnemonic = 'OP_SET_VAR';
          if (pc + 6 <= code.length) {
            const varId = view.getUint16(pc, true);
            const val = view.getInt32(pc + 2, true);
            for (let k = 0; k < 6; k++) hexBytes.push(code[pc + k].toString(16).padStart(2, '0'));
            pc += 6;
            args = `id=${varId}, value=${val}`;
          }
          break;
        }

        case OPCODES.WAIT: {
          mnemonic = 'OP_WAIT';
          if (pc + 2 <= code.length) {
            const frames = view.getUint16(pc, true);
            hexBytes.push(code[pc].toString(16).padStart(2, '0'));
            hexBytes.push(code[pc + 1].toString(16).padStart(2, '0'));
            pc += 2;
            args = `frames=${frames} (${(frames / 60).toFixed(1)}s)`;
          }
          break;
        }

        case OPCODES.TRANSFER: {
          mnemonic = 'OP_TRANSFER';
          if (pc + 7 <= code.length) {
            const mapId = view.getUint16(pc, true);
            const tx = view.getUint16(pc + 2, true);
            const ty = view.getUint16(pc + 4, true);
            const dir = code[pc + 6];
            for (let k = 0; k < 7; k++) hexBytes.push(code[pc + k].toString(16).padStart(2, '0'));
            pc += 7;
            args = `map=${mapId}, x=${tx}, y=${ty}, dir=${dir}`;
          }
          break;
        }

        default:
          args = '...';
      }

      instructions.push({
        offset,
        hex: hexBytes.join(' '),
        mnemonic,
        args,
      });
    }

    return instructions;
  };

  const instructions = disassemble(eventVm.rawBytecode);

  return (
    <div className="space-y-4">
      {/* VM Status & Registers Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-950/60 border border-violet-800/50 rounded-lg text-violet-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Event VM Interpreter (Sección 9 & Anexo A)</h3>
              <p className="text-xs text-slate-400">Máquina virtual compacta de bytecode inmutable ejecutada en MIPS R3000A</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
              <span className="text-slate-500 mr-2">STATE:</span>
              <span className={`font-bold ${eventVm.state === 'RUNNING' ? 'text-emerald-400' : eventVm.state === 'WAIT_UI' ? 'text-cyan-400' : 'text-slate-400'}`}>
                {eventVm.state}
              </span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
              <span className="text-slate-500 mr-2">PC:</span>
              <span className="text-amber-400 font-bold">0x{eventVm.pc.toString(16).padStart(4, '0')}</span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
              <span className="text-slate-500 mr-2">EVENT ID:</span>
              <span className="text-slate-200">{eventVm.eventId}</span>
            </div>
          </div>
        </div>

        {/* Global Switches & Variables (Section 10) */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Switches Bitset View */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Bitset Global de Switches (1 bit por switch)</span>
              <span className="font-mono text-[10px] text-slate-500">63 bytes para 500 switches</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              {[1, 2, 3, 4].map((swId) => (
                <div
                  key={swId}
                  className={`p-2 rounded border flex items-center justify-between transition-colors ${
                    switches[swId]
                      ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-500'
                  }`}
                >
                  <span>SW #{swId}</span>
                  <span className="font-bold">{switches[swId] ? 'ON' : 'OFF'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Variables View */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-slate-300">Variables (int32[])</span>
              <span className="font-mono text-[10px] text-slate-500">Hasta max_var_id_used</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs font-mono">
              {[1, 2, 3, 4].map((varId) => (
                <div key={varId} className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">V #{varId}</span>
                  <span className="font-bold text-slate-200">{variables[varId] || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Disassembly Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-2">
          <span>Desensamblado de Bytecode Activo (Inmutable)</span>
          <span className="text-[10px] font-normal text-slate-500 font-mono">
            {instructions.length} instrucciones
          </span>
        </h4>

        {instructions.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Ningún evento en ejecución actualmente. Acércate a un personaje en el mapa y presiona <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">Espacio</kbd> o <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono">Cruz</kbd>.
          </div>
        ) : (
          <div className="border border-slate-800 rounded-lg overflow-hidden font-mono text-xs">
            <table className="w-full text-left divide-y divide-slate-800">
              <thead className="bg-slate-950 text-slate-400 text-[11px]">
                <tr>
                  <th className="py-2 px-3 w-16">Offset</th>
                  <th className="py-2 px-3 w-28">Bytes Hex</th>
                  <th className="py-2 px-3 w-36">Mnemónico</th>
                  <th className="py-2 px-3">Operandos Decodificados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 bg-slate-900">
                {instructions.map((inst) => {
                  const isCurrentPc = eventVm.pc >= inst.offset && eventVm.pc < inst.offset + inst.hex.split(' ').length;
                  return (
                    <tr
                      key={inst.offset}
                      className={isCurrentPc ? 'bg-indigo-950/60 text-indigo-200 font-semibold' : 'text-slate-300 hover:bg-slate-850'}
                    >
                      <td className="py-1.5 px-3 text-slate-500">
                        {isCurrentPc && <ArrowRight className="w-3 h-3 text-indigo-400 inline mr-1" />}
                        0x{inst.offset.toString(16).padStart(4, '0')}
                      </td>
                      <td className="py-1.5 px-3 text-slate-400">{inst.hex}</td>
                      <td className="py-1.5 px-3 text-violet-300 font-bold">{inst.mnemonic}</td>
                      <td className="py-1.5 px-3 text-slate-200">{inst.args}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
