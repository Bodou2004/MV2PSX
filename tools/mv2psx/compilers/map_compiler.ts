/**
 * MV2PSX Map Compiler
 * Encodes RPG Maker MV Map data into the binary format MAP.BIN (MVM1)
 * strictly following Section 7.1 of the architecture specification.
 */

import { MVMapData, CompiledMapBinary, CompiledEventBytecode } from '../ir/types.ts';
import { EventCompiler } from './event_compiler.ts';

export class MapCompiler {
  private eventCompiler = new EventCompiler();

  public compile(mapId: number, mapData: MVMapData, tileset?: { flags: number[] }): CompiledMapBinary {
    const width = mapData.width;
    const height = mapData.height;
    const tilesetId = mapData.tilesetId || 1;
    const totalCells = width * height;

    // Detect layer count (MV maps have width * height * 6 entries; usually layers 0..3 are ground and decor)
    const rawTileCount = mapData.data ? mapData.data.length : 0;
    const layerCount = Math.max(1, Math.min(4, Math.floor(rawTileCount / totalCells) || 1));

    // Extract tiles (layer 0 to layerCount - 1)
    const tileLayers: number[][] = [];
    for (let l = 0; l < layerCount; l++) {
      const layerSlice = mapData.data.slice(l * totalCells, (l + 1) * totalCells);
      tileLayers.push(layerSlice);
    }

    // Build passability bitmask matrix (width * height bytes)
    // 0x0F = walkable all directions (down: 0x01, left: 0x02, right: 0x04, up: 0x08)
    // 0x00 = blocked/solid wall
    // Uses Tilesets.json flags if available, otherwise maps standard tile semantics
    const passData = new Uint8Array(totalCells);
    const getTileFlag = (tileId: number): number => {
      if (tileset && tileset.flags && tileId < tileset.flags.length) {
        return tileset.flags[tileId] ?? 0;
      }
      // Fallback default flag map
      if (tileId === 2 || tileId === 4 || tileId === 5 || tileId === 7) {
        return 0x0f; // Block all 4 directions
      }
      return 0x00; // Walkable
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const groundTile = tileLayers[0] ? tileLayers[0][idx] : 1;
        const upperTile = layerCount > 1 && tileLayers[1] ? tileLayers[1][idx] : 0;

        let passMask = 0x0f; // Start with all directions walkable (1: down, 2: left, 4: right, 8: up)

        const groundFlag = getTileFlag(groundTile);
        if ((groundFlag & 0x01) !== 0) passMask &= ~0x01;
        if ((groundFlag & 0x02) !== 0) passMask &= ~0x02;
        if ((groundFlag & 0x04) !== 0) passMask &= ~0x04;
        if ((groundFlag & 0x08) !== 0) passMask &= ~0x08;

        if (upperTile > 0) {
          const upperFlag = getTileFlag(upperTile);
          // If not a star tile (bit 0x10)
          if ((upperFlag & 0x10) === 0) {
            if ((upperFlag & 0x01) !== 0) passMask &= ~0x01;
            if ((upperFlag & 0x02) !== 0) passMask &= ~0x02;
            if ((upperFlag & 0x04) !== 0) passMask &= ~0x04;
            if ((upperFlag & 0x08) !== 0) passMask &= ~0x08;
          }
        }

        // Map boundary check: if border tile is solid, keep blocked
        if ((x === 0 || x === width - 1 || y === 0 || y === height - 1) && (groundTile === 2 || groundTile === 5)) {
          passMask = 0x00;
        }

        passData[idx] = passMask;
      }
    }

    // Compile events
    const compiledEvents: CompiledEventBytecode[] = [];
    if (mapData.events) {
      for (const ev of mapData.events) {
        if (!ev) continue;
        for (let pIdx = 0; pIdx < ev.pages.length; pIdx++) {
          const page = ev.pages[pIdx];
          const compiledPage = this.eventCompiler.compilePage(
            ev.id,
            pIdx,
            page,
            ev.x,
            ev.y
          );
          compiledEvents.push(compiledPage);
        }
      }
    }

    const strings = this.eventCompiler.getStrings();

    // Now construct the binary buffer
    // Calculate layout & offsets:
    // Header: strictly 38 bytes matching MapHeader struct (Section 7.1)
    const HEADER_SIZE = 38;
    const tileDataOff = HEADER_SIZE;
    const tileDataSize = totalCells * layerCount * 2; // u16 per tile

    const passDataOff = tileDataOff + tileDataSize;
    const passDataSize = totalCells; // u8 per cell

    // Pad to 4-byte boundary for event table
    const passDataEndAligned = (passDataOff + passDataSize + 3) & ~3;

    // Event table: 18 bytes per event entry + variable bytecode
    const EVENT_DESC_SIZE = 18;
    const eventTableOff = passDataEndAligned;
    const eventTableDescSize = compiledEvents.length * EVENT_DESC_SIZE;

    // Bytecode block immediately follows event descriptors
    const bytecodeBlockOff = eventTableOff + eventTableDescSize;
    let totalBytecodeLen = 0;
    const eventBytecodeOffsets: number[] = [];

    for (const ev of compiledEvents) {
      eventBytecodeOffsets.push(bytecodeBlockOff + totalBytecodeLen);
      totalBytecodeLen += ev.bytecode.length;
    }

    const stringsOffAligned = (bytecodeBlockOff + totalBytecodeLen + 3) & ~3;

    // Strings block: count (u16) + for each string: length (u16) + bytes + \0
    let stringsBlockSize = 2; // count u16
    for (const str of strings) {
      const utf8Bytes = new TextEncoder().encode(str);
      stringsBlockSize += 2 + utf8Bytes.length + 1;
    }

    const totalFileSize = stringsOffAligned + stringsBlockSize;
    const buffer = new Uint8Array(totalFileSize);
    const view = new DataView(buffer.buffer);

    // Write Header (Section 7.1)
    // magic[4] = "MVM1"
    buffer[0] = 0x4d; // 'M'
    buffer[1] = 0x56; // 'V'
    buffer[2] = 0x4d; // 'M'
    buffer[3] = 0x31; // '1'
    view.setUint16(4, 1, true); // version = 1
    view.setUint16(6, mapId, true);
    view.setUint16(8, width, true);
    view.setUint16(10, height, true);
    view.setUint16(12, tilesetId, true);
    buffer[14] = layerCount;
    buffer[15] = 0; // flags
    view.setUint16(16, compiledEvents.length, true);
    view.setUint32(18, tileDataOff, true);
    view.setUint32(22, passDataOff, true);
    view.setUint32(26, eventTableOff, true);
    view.setUint32(30, stringsOffAligned, true);
    view.setUint32(34, totalFileSize, true);

    // Write Tile Data
    let tOff = tileDataOff;
    for (let l = 0; l < layerCount; l++) {
      for (let i = 0; i < totalCells; i++) {
        const val = tileLayers[l][i] || 0;
        view.setUint16(tOff, val, true);
        tOff += 2;
      }
    }

    // Write Passability Data
    buffer.set(passData, passDataOff);

    // Write Event Table Descriptors
    let eOff = eventTableOff;
    for (let i = 0; i < compiledEvents.length; i++) {
      const ev = compiledEvents[i];
      view.setUint16(eOff, ev.eventId, true);
      view.setInt16(eOff + 2, ev.x, true);
      view.setInt16(eOff + 4, ev.y, true);
      buffer[eOff + 6] = ev.trigger;
      buffer[eOff + 7] = ev.priority;
      view.setUint16(eOff + 8, ev.graphicId, true);
      view.setUint16(eOff + 10, ev.conditionSwitchId, true);
      view.setUint32(eOff + 12, eventBytecodeOffsets[i], true);
      view.setUint16(eOff + 16, ev.bytecode.length, true);
      eOff += EVENT_DESC_SIZE;
    }

    // Write Bytecode
    for (let i = 0; i < compiledEvents.length; i++) {
      buffer.set(compiledEvents[i].bytecode, eventBytecodeOffsets[i]);
    }

    // Write Strings Table
    let sOff = stringsOffAligned;
    view.setUint16(sOff, strings.length, true);
    sOff += 2;
    for (const str of strings) {
      const utf8Bytes = new TextEncoder().encode(str);
      view.setUint16(sOff, utf8Bytes.length, true);
      sOff += 2;
      buffer.set(utf8Bytes, sOff);
      sOff += utf8Bytes.length;
      buffer[sOff] = 0; // null terminator
      sOff += 1;
    }

    return {
      mapId,
      buffer,
      header: {
        magic: 'MVM1',
        version: 1,
        mapId,
        width,
        height,
        tilesetId,
        layerCount,
        flags: 0,
        eventCount: compiledEvents.length,
        tileDataOff,
        passDataOff,
        eventTableOff,
        stringsOff: stringsOffAligned,
        fileSize: totalFileSize,
      },
      events: compiledEvents,
      strings,
    };
  }
}
