/**
 * MV2PSX Event Compiler
 * Compiles RPG Maker MV event command lists into EventVM Bytecode according to
 * Section 9 and Annex A of the specification.
 */

import { MVEventCommand, MVEventPage, CompiledEventBytecode } from '../ir/types.ts';

export const OPCODES = {
  END: 0x00,
  TEXT: 0x01,
  CHOICE: 0x02,
  SET_SWITCH: 0x03,
  SET_VAR: 0x04,
  VAR_OP: 0x05,
  TEST: 0x06,
  JZ: 0x07,
  JMP: 0x08,
  WAIT: 0x09,
  TRANSFER: 0x0a,
  PLAY_SE: 0x0b,
  PLAY_BGM: 0x0c,
  COMMON: 0x0d,
  ITEM_ADD: 0x0e,
  BATTLE: 0x0f,
  NATIVE_CALL: 0x10,
} as const;

export class EventCompiler {
  private stringTable: string[] = [];
  private stringMap = new Map<string, number>();

  constructor(existingStrings: string[] = []) {
    for (const str of existingStrings) {
      this.internString(str);
    }
  }

  public internString(text: string): number {
    const trimmed = text.trim();
    if (this.stringMap.has(trimmed)) {
      return this.stringMap.get(trimmed)!;
    }
    const id = this.stringTable.length;
    this.stringTable.push(trimmed);
    this.stringMap.set(trimmed, id);
    return id;
  }

  public getStrings(): string[] {
    return [...this.stringTable];
  }

  public compilePage(
    eventId: number,
    pageIndex: number,
    page: MVEventPage,
    x: number,
    y: number
  ): CompiledEventBytecode {
    const bytes: number[] = [];

    const writeU8 = (val: number) => bytes.push(val & 0xff);
    const writeU16 = (val: number) => {
      bytes.push(val & 0xff);
      bytes.push((val >> 8) & 0xff);
    };
    const writeS16 = (val: number) => {
      const v = val < 0 ? 0x10000 + val : val;
      writeU16(v);
    };
    const writeS32 = (val: number) => {
      const v = val < 0 ? 0x100000000 + val : val;
      bytes.push(v & 0xff);
      bytes.push((v >> 8) & 0xff);
      bytes.push((v >> 16) & 0xff);
      bytes.push((v >> 24) & 0xff);
    };

    let i = 0;
    const commands = page.list || [];

    while (i < commands.length) {
      const cmd = commands[i];

      // Code 101: Show Text Header, followed by 401: text lines
      if (cmd.code === 101) {
        const textLines: string[] = [];
        let j = i + 1;
        while (j < commands.length && commands[j].code === 401) {
          textLines.push(commands[j].parameters[0]);
          j++;
        }
        const fullText = textLines.join('\n');
        const strId = this.internString(fullText);

        writeU8(OPCODES.TEXT);
        writeU16(strId);
        i = j;
        continue;
      }

      // Code 121: Control Switches: [startId, endId, value(0: ON, 1: OFF)]
      if (cmd.code === 121) {
        const startId = cmd.parameters[0] || 1;
        const endId = cmd.parameters[1] || startId;
        const val = cmd.parameters[2] === 0 ? 1 : 0; // In MV, 0 = ON, 1 = OFF
        for (let sId = startId; sId <= endId; sId++) {
          writeU8(OPCODES.SET_SWITCH);
          writeU16(sId);
          writeU8(val);
        }
        i++;
        continue;
      }

      // Code 122: Control Variables: [startId, endId, opType, operandType, value]
      if (cmd.code === 122) {
        const varId = cmd.parameters[0] || 1;
        const opType = cmd.parameters[2] || 0; // 0 = Set, 1 = Add, 2 = Sub, 3 = Mul, 4 = Div, 5 = Mod
        const val = cmd.parameters[4] || 0;

        if (opType === 0) {
          writeU8(OPCODES.SET_VAR);
          writeU16(varId);
          writeS32(val);
        } else {
          writeU8(OPCODES.VAR_OP);
          writeU16(varId);
          writeU8(opType);
          writeS32(val);
        }
        i++;
        continue;
      }

      // Code 230: Wait (parameters[0] = frames)
      if (cmd.code === 230) {
        const frames = cmd.parameters[0] || 60;
        writeU8(OPCODES.WAIT);
        writeU16(frames);
        i++;
        continue;
      }

      // Code 201: Transfer Player: [transferType, mapId, x, y, direction, fade]
      if (cmd.code === 201) {
        const mapId = cmd.parameters[1] || 1;
        const targetX = cmd.parameters[2] || 0;
        const targetY = cmd.parameters[3] || 0;
        const dir = cmd.parameters[4] || 2; // 2: Down, 4: Left, 6: Right, 8: Up
        writeU8(OPCODES.TRANSFER);
        writeU16(mapId);
        writeU16(targetX);
        writeU16(targetY);
        writeU8(dir);
        i++;
        continue;
      }

      // Code 250: Play SE: [{ name, volume, pitch, pan }]
      if (cmd.code === 250) {
        const seName = cmd.parameters[0]?.name || 'se';
        const seId = this.internString(seName);
        writeU8(OPCODES.PLAY_SE);
        writeU16(seId);
        i++;
        continue;
      }

      // Code 241: Play BGM
      if (cmd.code === 241) {
        const bgmName = cmd.parameters[0]?.name || 'bgm';
        const bgmId = this.internString(bgmName);
        writeU8(OPCODES.PLAY_BGM);
        writeU16(bgmId);
        i++;
        continue;
      }

      // Code 0: End of block
      if (cmd.code === 0) {
        i++;
        continue;
      }

      // Unhandled / editorial or unsupported codes are skipped cleanly
      i++;
    }

    // Always terminate with OP_END (0x00)
    writeU8(OPCODES.END);

    const conditionSwitchId =
      page.conditions?.switch1Valid && page.conditions?.switch1Id
        ? page.conditions.switch1Id
        : 0;

    return {
      eventId,
      pageIndex,
      trigger: page.trigger ?? 0,
      priority: page.priorityType ?? 1,
      x,
      y,
      graphicId: page.image?.characterName ? 1 : 0,
      conditionSwitchId,
      bytecode: new Uint8Array(bytes),
    };
  }
}
