/**
 * MV2PSX Memory Estimator & Compatibility Reporter
 * Strictly adheres to Sections 2.1, 2.2, and 17 of the MV2PSX Architecture.
 * Analyzes RAM footprint per map/scene, verifies budgets, and produces recommendations.
 */

import { CompiledMapBinary, MemoryReportItem } from '../ir/types.ts';

export class MemoryEstimator {
  public static readonly RAM_BUDGET = 2048 * 1024; // 2 MB
  public static readonly VRAM_BUDGET = 1024 * 1024; // 1 MB

  // Resident & subsystem budgets (Section 2.1)
  public static readonly RESIDENT_CODE = 256 * 1024; // 256 KB
  public static readonly GLOBAL_DATA = 128 * 1024; // 128 KB
  public static readonly CD_AUDIO_BUFFERS = 128 * 1024; // 128 KB
  public static readonly SPRITES_SCRATCH = 192 * 1024; // 192 KB
  public static readonly SAFETY_RESERVE = 256 * 1024; // 256 KB

  public estimateMap(mapBinary: CompiledMapBinary, sceneName: string): MemoryReportItem {
    const mapSize = mapBinary.buffer.byteLength;
    const tileDataSize = mapBinary.header.width * mapBinary.header.height * mapBinary.header.layerCount * 2;
    const eventTableSize = mapBinary.header.eventCount * 18;
    const bytecodeSize = mapBinary.events.reduce((acc, e) => acc + e.bytecode.length, 0);
    const stringsSize = mapBinary.strings.reduce((acc, s) => acc + s.length + 3, 2);

    // Map Arena allocation (Section 6.1)
    const totalMapArena = mapSize + 16 * 1024; // extra staging padding

    const totalRam =
      MemoryEstimator.RESIDENT_CODE +
      MemoryEstimator.GLOBAL_DATA +
      MemoryEstimator.CD_AUDIO_BUFFERS +
      MemoryEstimator.SPRITES_SCRATCH +
      MemoryEstimator.SAFETY_RESERVE +
      totalMapArena;

    // VRAM estimate (Section 2.2):
    // Double buffer 320x240 @ 16bpp = 320*240*2 * 2 = 307.2 KB
    // Tileset texture page = 128 KB (256x256 8bpp) or 256 KB (16bpp)
    // Character sprites = 64 KB
    // UI Window font = 32 KB
    // CLUT palettes = 4 KB
    const estimatedVram = (307.2 + 128 + 64 + 32 + 4) * 1024;

    const suggestions: string[] = [];
    let status: 'OK' | 'WARNING' | 'ERROR' = 'OK';

    if (totalRam > MemoryEstimator.RAM_BUDGET) {
      status = 'ERROR';
      suggestions.push('El mapa excede el presupuesto total de 2 MB de RAM.');
      suggestions.push('Reducir dimensiones de capa o fragmentar mapa.');
    } else if (totalRam > MemoryEstimator.RAM_BUDGET - 128 * 1024) {
      status = 'WARNING';
      suggestions.push('Margen de seguridad de RAM ajustado (<128 KB restante).');
    }

    if (estimatedVram > MemoryEstimator.VRAM_BUDGET) {
      status = 'ERROR';
      suggestions.push('VRAM desbordada. Convertir texturas a 4bpp o 8bpp.');
    } else {
      suggestions.push('VRAM optimizada: Texturas en 8bpp con CLUT compartida.');
    }

    return {
      sceneName,
      mapId: mapBinary.mapId,
      mapBytes: tileDataSize,
      eventsBytes: eventTableSize + bytecodeSize,
      stringsBytes: stringsSize,
      runtimeResidentBytes: MemoryEstimator.RESIDENT_CODE,
      globalDataBytes: MemoryEstimator.GLOBAL_DATA,
      cdAudioBufferBytes: MemoryEstimator.CD_AUDIO_BUFFERS,
      spritesScratchBytes: MemoryEstimator.SPRITES_SCRATCH,
      safetyReserveBytes: MemoryEstimator.SAFETY_RESERVE,
      totalEstimatedRamBytes: totalRam,
      ramBudgetLimitBytes: MemoryEstimator.RAM_BUDGET,
      estimatedVramBytes: Math.round(estimatedVram),
      vramBudgetLimitBytes: MemoryEstimator.VRAM_BUDGET,
      status,
      suggestions,
    };
  }
}
