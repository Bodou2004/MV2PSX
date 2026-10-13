/**
 * MV2PSX Compiler Main Pipeline Entry Point
 */

import { SystemData, MVMapData, CompiledMapBinary, BuildReport, MemoryReportItem } from './ir/types.ts';
import { ProjectScanner } from './scanner/project_scanner.ts';
import { MapCompiler } from './compilers/map_compiler.ts';
import { MemoryEstimator } from './reports/memory_estimator.ts';

export interface CompilationResult {
  report: BuildReport;
  maps: Map<number, CompiledMapBinary>;
  featuresHeader: string;
}

export class MV2PSXCompiler {
  private scanner = new ProjectScanner();
  private mapCompiler = new MapCompiler();
  private estimator = new MemoryEstimator();

  public compileProject(
    projectName: string,
    system: SystemData,
    maps: { id: number; data: MVMapData }[],
    tilesets?: (any | null)[]
  ): CompilationResult {
    const rawMaps = maps.map((m) => m.data);
    const features = this.scanner.scan(system, rawMaps);
    const featuresHeader = this.scanner.generateFeaturesHeader(features);

    const compiledMaps = new Map<number, CompiledMapBinary>();
    const memoryReports: MemoryReportItem[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    for (const m of maps) {
      try {
        const tileset = tilesets && m.data.tilesetId ? tilesets[m.data.tilesetId] : undefined;
        const compiled = this.mapCompiler.compile(m.id, m.data, tileset);
        compiledMaps.set(m.id, compiled);

        const memReport = this.estimator.estimateMap(
          compiled,
          m.data.displayName || `Map ${m.id.toString().padStart(3, '0')}`
        );
        memoryReports.push(memReport);

        if (memReport.status === 'WARNING') {
          warnings.push(`Map ${m.id}: Memoria cercana al límite sugerido`);
        } else if (memReport.status === 'ERROR') {
          errors.push(`Map ${m.id}: Excede los límites de RAM/VRAM de PlayStation 1`);
        }
      } catch (err: any) {
        errors.push(`Error al compilar Map ${m.id}: ${err.message || String(err)}`);
      }
    }

    // Find worst RAM scene
    let worstScene = memoryReports[0];
    for (const report of memoryReports) {
      if (report.totalEstimatedRamBytes > worstScene.totalEstimatedRamBytes) {
        worstScene = report;
      }
    }

    const report: BuildReport = {
      projectName,
      timestamp: new Date().toISOString(),
      features,
      featuresHeader,
      mapsCompiled: compiledMaps.size,
      memoryReports,
      worstScene: worstScene || {
        sceneName: 'None',
        mapId: 0,
        mapBytes: 0,
        eventsBytes: 0,
        stringsBytes: 0,
        runtimeResidentBytes: 256 * 1024,
        globalDataBytes: 128 * 1024,
        cdAudioBufferBytes: 128 * 1024,
        spritesScratchBytes: 192 * 1024,
        safetyReserveBytes: 256 * 1024,
        totalEstimatedRamBytes: 960 * 1024,
        ramBudgetLimitBytes: 2048 * 1024,
        estimatedVramBytes: 531 * 1024,
        vramBudgetLimitBytes: 1024 * 1024,
        status: 'OK',
        suggestions: [],
      },
      warnings,
      errors,
    };

    return {
      report,
      maps: compiledMaps,
      featuresHeader,
    };
  }
}

export * from './ir/types.ts';
export * from './scanner/project_scanner.ts';
export * from './compilers/map_compiler.ts';
export * from './compilers/event_compiler.ts';
export * from './reports/memory_estimator.ts';
