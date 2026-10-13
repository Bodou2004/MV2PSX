/**
 * MV2PSX PS1 Virtual Hardware Runtime Engine
 * Executes compiled MAP.BIN formats, simulates the 5 Memory Arenas,
 * interprets EventVM bytecode, and renders to a 320x240 double-buffered framebuffer.
 */

import { CompiledMapBinary } from '../../tools/mv2psx/ir/types.ts';
import { OPCODES } from '../../tools/mv2psx/compilers/event_compiler.ts';
import { RuntimeState, PlayerState, DialogState } from '../types/runtime.ts';

const TILE_SIZE = 16;
const SCREEN_WIDTH = 320;
const SCREEN_HEIGHT = 240;

export class PS1RuntimeEmulator {
  private compiledMaps = new Map<number, CompiledMapBinary>();
  private activeMap: CompiledMapBinary | null = null;

  // Global State (Section 10)
  private switches: boolean[] = new Array(512).fill(false);
  private variables: number[] = new Array(128).fill(0);

  // Arena Telemetry tracking (Section 6)
  private permUsed = 64 * 1024; // 64 KB baseline for managers & tables
  private permCapacity = 128 * 1024;
  private permHWM = 64 * 1024;

  private sceneUsed = 32 * 1024;
  private sceneCapacity = 256 * 1024;
  private sceneHWM = 32 * 1024;

  private mapUsed = 0;
  private mapCapacity = 512 * 1024; // 512 KB
  private mapHWM = 0;

  private scratchUsed = 16 * 1024;
  private scratchCapacity = 128 * 1024;
  private scratchHWM = 16 * 1024;

  private ioUsed = 24 * 1024;
  private ioCapacity = 128 * 1024;
  private ioHWM = 24 * 1024;

  // Player & Camera
  private player: PlayerState = {
    x: 9,
    y: 10,
    dir: 2, // Down
    isMoving: false,
    moveProgress: 0,
    animFrame: 0,
  };
  private targetTileX = 9;
  private targetTileY = 10;
  private cameraX = 0;
  private cameraY = 0;

  // Event VM State (Section 9.2)
  private vmState = {
    active: false,
    code: new Uint8Array() as Uint8Array,
    pc: 0,
    eventId: 0,
    mapId: 0,
    waitFrames: 0,
    state: 'INACTIVE' as 'INACTIVE' | 'RUNNING' | 'WAIT_FRAMES' | 'WAIT_UI' | 'TRANSFER',
    flags: 0,
    transferMapId: 0,
    transferX: 0,
    transferY: 0,
    transferDir: 2,
    currentOpcodeName: 'OP_END',
  };

  // Dialog UI
  private dialog: DialogState = {
    isOpen: false,
    text: '',
    stringId: 0,
    charIndex: 0,
  };

  private frameCount = 0;
  private activeBuffer: 'A' | 'B' = 'A';

  constructor(maps: Map<number, CompiledMapBinary>) {
    this.compiledMaps = maps;
  }

  public setMaps(maps: Map<number, CompiledMapBinary>) {
    this.compiledMaps = maps;
  }

  public boot(startMapId = 1, startX = 9, startY = 10) {
    this.switches.fill(false);
    this.variables.fill(0);
    this.player.x = startX;
    this.player.y = startY;
    this.targetTileX = startX;
    this.targetTileY = startY;
    this.player.dir = 8; // facing up
    this.player.isMoving = false;
    this.player.moveProgress = 0;
    this.loadMap(startMapId);
  }

  public loadMap(mapId: number) {
    // 1. Reset Map Arena in O(1) (Section 6.1)
    this.mapUsed = 0;

    const mapBinary = this.compiledMaps.get(mapId);
    if (!mapBinary) {
      console.error(`Map ${mapId} not found`);
      return false;
    }

    this.activeMap = mapBinary;
    // Map binary allocation inside g_map_arena
    const allocSize = mapBinary.buffer.byteLength + 4096; // buffer + runtime structures
    this.mapUsed = allocSize;
    if (this.mapUsed > this.mapHWM) {
      this.mapHWM = this.mapUsed;
    }

    // Adjust camera to player
    this.centerCamera();
    return true;
  }

  private centerCamera() {
    if (!this.activeMap) return;
    const px = (this.player.x + (this.player.isMoving ? (this.targetTileX - this.player.x) * this.player.moveProgress : 0)) * TILE_SIZE;
    const py = (this.player.y + (this.player.isMoving ? (this.targetTileY - this.player.y) * this.player.moveProgress : 0)) * TILE_SIZE;

    const mapPixelW = this.activeMap.header.width * TILE_SIZE;
    const mapPixelH = this.activeMap.header.height * TILE_SIZE;

    let cx = px - SCREEN_WIDTH / 2 + TILE_SIZE / 2;
    let cy = py - SCREEN_HEIGHT / 2 + TILE_SIZE / 2;

    if (mapPixelW <= SCREEN_WIDTH) {
      cx = (mapPixelW - SCREEN_WIDTH) / 2;
    } else {
      cx = Math.max(0, Math.min(cx, mapPixelW - SCREEN_WIDTH));
    }

    if (mapPixelH <= SCREEN_HEIGHT) {
      cy = (mapPixelH - SCREEN_HEIGHT) / 2;
    } else {
      cy = Math.max(0, Math.min(cy, mapPixelH - SCREEN_HEIGHT));
    }

    this.cameraX = cx;
    this.cameraY = cy;
  }

  public isPassable(tileX: number, tileY: number, dir = 0): boolean {
    if (!this.activeMap) return false;
    const { width, height } = this.activeMap.header;

    if (tileX < 0 || tileX >= width || tileY < 0 || tileY >= height) {
      return false;
    }

    const idx = tileY * width + tileX;
    const passOff = this.activeMap.header.passDataOff;
    const mask = this.activeMap.buffer[passOff + idx];

    if (mask === 0x00) return false;
    if (dir !== 0 && (mask & dir) === 0) return false;

    // Check if solid NPC event exists at target tile
    for (const ev of this.activeMap.events) {
      if (ev.x === tileX && ev.y === tileY && ev.priority === 1) {
        // Same level obstacle
        return false;
      }
    }

    return true;
  }

  public handleInput(pad: { up: boolean; down: boolean; left: boolean; right: boolean; action: boolean }) {
    // If dialog is open, action button advances/dismisses text
    if (this.dialog.isOpen) {
      if (pad.action) {
        if (this.dialog.charIndex < this.dialog.text.length) {
          // Finish typewriter
          this.dialog.charIndex = this.dialog.text.length;
        } else {
          // Close dialog and resume VM
          this.dialog.isOpen = false;
          if (this.vmState.active && this.vmState.state === 'WAIT_UI') {
            this.vmState.state = 'RUNNING';
          }
        }
      }
      return;
    }

    // If VM is running, player cannot move
    if (this.vmState.active && this.vmState.state !== 'INACTIVE') {
      return;
    }

    // Action button triggers interaction with facing tile or current tile event
    if (pad.action && !this.player.isMoving) {
      let checkX = this.player.x;
      let checkY = this.player.y;

      if (this.player.dir === 8) checkY--;
      else if (this.player.dir === 2) checkY++;
      else if (this.player.dir === 4) checkX--;
      else if (this.player.dir === 6) checkX++;

      if (this.triggerEventAt(checkX, checkY, 0) || this.triggerEventAt(this.player.x, this.player.y, 0)) {
        return;
      }
    }

    // Continuous movement
    if (!this.player.isMoving) {
      let dx = 0;
      let dy = 0;
      let newDir: 2 | 4 | 6 | 8 = this.player.dir;

      if (pad.up) {
        dy = -1;
        newDir = 8;
      } else if (pad.down) {
        dy = 1;
        newDir = 2;
      } else if (pad.left) {
        dx = -1;
        newDir = 4;
      } else if (pad.right) {
        dx = 1;
        newDir = 6;
      }

      if (dx !== 0 || dy !== 0) {
        this.player.dir = newDir;
        const targetX = this.player.x + dx;
        const targetY = this.player.y + dy;

        if (this.isPassable(targetX, targetY)) {
          this.player.isMoving = true;
          this.targetTileX = targetX;
          this.targetTileY = targetY;
          this.player.moveProgress = 0;
        }
      }
    }
  }

  public triggerEventAt(x: number, y: number, triggerType: number): boolean {
    if (!this.activeMap) return false;

    // Find event matching coordinates and switch conditions
    for (let i = this.activeMap.events.length - 1; i >= 0; i--) {
      const ev = this.activeMap.events[i];
      if (ev.x === x && ev.y === y && ev.trigger === triggerType) {
        // Condition check
        if (ev.conditionSwitchId > 0 && !this.switches[ev.conditionSwitchId]) {
          continue; // Switch not active, skip this page
        }

        // Start Event VM
        this.startVM(ev.bytecode, ev.eventId);
        return true;
      }
    }
    return false;
  }

  private startVM(bytecode: Uint8Array, eventId: number) {
    this.vmState.active = true;
    this.vmState.code = bytecode;
    this.vmState.pc = 0;
    this.vmState.eventId = eventId;
    this.vmState.mapId = this.activeMap?.header.mapId || 1;
    this.vmState.waitFrames = 0;
    this.vmState.state = 'RUNNING';
    this.vmState.flags = 0;
    this.stepVM();
  }

  public stepVM() {
    if (!this.vmState.active || this.vmState.state === 'INACTIVE') {
      return;
    }

    if (this.vmState.state === 'WAIT_FRAMES') {
      if (this.vmState.waitFrames > 0) {
        this.vmState.waitFrames--;
        return;
      }
      this.vmState.state = 'RUNNING';
    }

    if (this.vmState.state === 'WAIT_UI' || this.vmState.state === 'TRANSFER') {
      return;
    }

    const code = this.vmState.code;
    const view = new DataView(code.buffer, code.byteOffset, code.byteLength);

    while (this.vmState.state === 'RUNNING' && this.vmState.pc < code.length) {
      const op = code[this.vmState.pc++];

      switch (op) {
        case OPCODES.END:
          this.vmState.currentOpcodeName = 'OP_END';
          this.vmState.state = 'INACTIVE';
          this.vmState.active = false;
          return;

        case OPCODES.TEXT: {
          this.vmState.currentOpcodeName = 'OP_TEXT';
          const strId = view.getUint16(this.vmState.pc, true);
          this.vmState.pc += 2;
          const str = this.activeMap?.strings[strId] || 'Texto';
          this.dialog = {
            isOpen: true,
            text: str,
            stringId: strId,
            charIndex: 0,
          };
          this.vmState.state = 'WAIT_UI';
          return;
        }

        case OPCODES.SET_SWITCH: {
          this.vmState.currentOpcodeName = 'OP_SET_SWITCH';
          const swId = view.getUint16(this.vmState.pc, true);
          this.vmState.pc += 2;
          const val = code[this.vmState.pc++] !== 0;
          this.switches[swId] = val;
          break;
        }

        case OPCODES.SET_VAR: {
          this.vmState.currentOpcodeName = 'OP_SET_VAR';
          const varId = view.getUint16(this.vmState.pc, true);
          this.vmState.pc += 2;
          const val = view.getInt32(this.vmState.pc, true);
          this.vmState.pc += 4;
          this.variables[varId] = val;
          break;
        }

        case OPCODES.VAR_OP: {
          this.vmState.currentOpcodeName = 'OP_VAR_OP';
          const varId = view.getUint16(this.vmState.pc, true);
          this.vmState.pc += 2;
          const opType = code[this.vmState.pc++];
          const rhs = view.getInt32(this.vmState.pc, true);
          this.vmState.pc += 4;
          let cur = this.variables[varId] || 0;
          if (opType === 1) cur += rhs;
          else if (opType === 2) cur -= rhs;
          else if (opType === 3) cur *= rhs;
          else if (opType === 4 && rhs !== 0) cur = Math.floor(cur / rhs);
          else if (opType === 5 && rhs !== 0) cur %= rhs;
          this.variables[varId] = cur;
          break;
        }

        case OPCODES.WAIT: {
          this.vmState.currentOpcodeName = 'OP_WAIT';
          const frames = view.getUint16(this.vmState.pc, true);
          this.vmState.pc += 2;
          this.vmState.waitFrames = frames;
          this.vmState.state = 'WAIT_FRAMES';
          return;
        }

        case OPCODES.TRANSFER: {
          this.vmState.currentOpcodeName = 'OP_TRANSFER';
          const targetMap = view.getUint16(this.vmState.pc, true);
          this.vmState.pc += 2;
          const tx = view.getUint16(this.vmState.pc, true);
          this.vmState.pc += 2;
          const ty = view.getUint16(this.vmState.pc, true);
          this.vmState.pc += 2;
          const dir = code[this.vmState.pc++];

          this.vmState.state = 'TRANSFER';
          this.vmState.transferMapId = targetMap;
          this.vmState.transferX = tx;
          this.vmState.transferY = ty;
          this.vmState.transferDir = dir;

          // Execute map transfer:
          this.executeTransfer(targetMap, tx, ty, dir);
          this.vmState.state = 'INACTIVE';
          this.vmState.active = false;
          return;
        }

        default:
          this.vmState.currentOpcodeName = `UNKNOWN(0x${op.toString(16)})`;
          this.vmState.state = 'INACTIVE';
          this.vmState.active = false;
          return;
      }
    }
  }

  private executeTransfer(mapId: number, x: number, y: number, dir: number) {
    this.loadMap(mapId);
    this.player.x = x;
    this.player.y = y;
    this.targetTileX = x;
    this.targetTileY = y;
    if (dir === 2 || dir === 4 || dir === 6 || dir === 8) {
      this.player.dir = dir;
    }
    this.player.isMoving = false;
    this.player.moveProgress = 0;
    this.centerCamera();
  }

  public update() {
    this.frameCount++;
    this.activeBuffer = this.frameCount % 2 === 0 ? 'A' : 'B';

    // Typewriter dialog progression
    if (this.dialog.isOpen && this.dialog.charIndex < this.dialog.text.length) {
      this.dialog.charIndex = Math.min(this.dialog.text.length, this.dialog.charIndex + 2);
    }

    // Player walking interpolation (16 pixels per tile, takes 12 frames @ 60fps)
    if (this.player.isMoving) {
      this.player.moveProgress += 0.12;
      this.player.animFrame = Math.floor(this.player.moveProgress * 4) % 4;

      if (this.player.moveProgress >= 1.0) {
        this.player.x = this.targetTileX;
        this.player.y = this.targetTileY;
        this.player.isMoving = false;
        this.player.moveProgress = 0;
        this.player.animFrame = 0;

        // Check player touch events (trigger = 1, e.g. door transfer trigger)
        this.triggerEventAt(this.player.x, this.player.y, 1);
      }
    }

    // Step Event VM if running
    this.stepVM();

    // Smooth camera tracking
    this.centerCamera();
  }

  public render(ctx: CanvasRenderingContext2D) {
    if (!this.activeMap) return;

    // PS1 Resolution: 320x240
    ctx.imageSmoothingEnabled = false;

    // Clear background
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const { width, height, layerCount } = this.activeMap.header;
    const tileDataOff = this.activeMap.header.tileDataOff;
    const buffer = this.activeMap.buffer;
    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

    // Section 7.3: Culling rectangle calculation
    const visible_x0 = Math.max(0, Math.floor(this.cameraX / TILE_SIZE));
    const visible_y0 = Math.max(0, Math.floor(this.cameraY / TILE_SIZE));
    const visible_x1 = Math.min(width, visible_x0 + Math.ceil(SCREEN_WIDTH / TILE_SIZE) + 1);
    const visible_y1 = Math.min(height, visible_y0 + Math.ceil(SCREEN_HEIGHT / TILE_SIZE) + 1);

    // Render Ground & Decor Layers
    for (let l = 0; l < layerCount; l++) {
      const layerOffset = tileDataOff + l * width * height * 2;

      for (let ty = visible_y0; ty < visible_y1; ty++) {
        for (let tx = visible_x0; tx < visible_x1; tx++) {
          const cellIdx = ty * width + tx;
          const tileVal = view.getUint16(layerOffset + cellIdx * 2, true);

          if (tileVal === 0) continue;

          const screenX = Math.round(tx * TILE_SIZE - this.cameraX);
          const screenY = Math.round(ty * TILE_SIZE - this.cameraY);

          this.drawTileGraphic(ctx, tileVal, screenX, screenY);
        }
      }
    }

    // Render Events (NPCs, portals, chests)
    for (const ev of this.activeMap.events) {
      if (ev.x < visible_x0 - 1 || ev.x > visible_x1 || ev.y < visible_y0 - 1 || ev.y > visible_y1) {
        continue;
      }

      // Check condition switch
      if (ev.conditionSwitchId > 0 && !this.switches[ev.conditionSwitchId]) {
        continue;
      }

      const screenX = Math.round(ev.x * TILE_SIZE - this.cameraX);
      const screenY = Math.round(ev.y * TILE_SIZE - this.cameraY);

      if (ev.graphicId > 0) {
        this.drawCharacterSprite(ctx, screenX, screenY, 2, 0, '#e2b342', '#334155');
      } else {
        // Portal / Door graphic
        ctx.fillStyle = this.switches[1] ? '#38bdf8' : '#71717a';
        ctx.fillRect(screenX + 3, screenY + 4, 10, 10);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(screenX + 5, screenY + 6, 6, 6);
      }
    }

    // Render Player Character
    let px = this.player.x * TILE_SIZE;
    let py = this.player.y * TILE_SIZE;
    if (this.player.isMoving) {
      px += (this.targetTileX - this.player.x) * this.player.moveProgress * TILE_SIZE;
      py += (this.targetTileY - this.player.y) * this.player.moveProgress * TILE_SIZE;
    }

    const playerScreenX = Math.round(px - this.cameraX);
    const playerScreenY = Math.round(py - this.cameraY);
    this.drawCharacterSprite(
      ctx,
      playerScreenX,
      playerScreenY,
      this.player.dir,
      this.player.animFrame,
      '#ef4444',
      '#1e293b'
    );

    // Render Authentic PS1 Dialog Box if Open
    if (this.dialog.isOpen) {
      this.drawDialogWindow(ctx);
    }
  }

  private drawTileGraphic(ctx: CanvasRenderingContext2D, tileId: number, x: number, y: number) {
    switch (tileId) {
      case 1: // Grass / meadow
        ctx.fillStyle = '#2d5a27';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#3a6b33';
        ctx.fillRect(x + 2, y + 3, 2, 2);
        ctx.fillRect(x + 10, y + 9, 2, 2);
        break;
      case 2: // Mountain / stone cliff
        ctx.fillStyle = '#475569';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#334155';
        ctx.fillRect(x, y + 12, TILE_SIZE, 4);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x, y, TILE_SIZE, 2);
        break;
      case 3: // Cobblestone path
        ctx.fillStyle = '#78716c';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#a8a29e';
        ctx.fillRect(x + 1, y + 1, 6, 6);
        ctx.fillRect(x + 8, y + 8, 7, 7);
        break;
      case 4: // House roof / wooden building
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(x, y + 7, TILE_SIZE, 2);
        break;
      case 5: // Sanctuary stone wall
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 7, y + 7, 2, 2); // rune dot
        break;
      case 6: // Sanctuary tiled floor
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = '#1e293b';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        break;
      case 7: // Sanctuary marble pillar
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(x + 3, y + 1, 10, 14);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(x + 5, y + 3, 6, 10);
        break;
      default:
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  private drawCharacterSprite(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    dir: number,
    frame: number,
    tunicColor: string,
    pantColor: string
  ) {
    // 16x16 PS1 pixel art character
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x + 8, y + 14, 6, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body & tunic
    ctx.fillStyle = tunicColor;
    ctx.fillRect(x + 4, y + 6, 8, 5);

    // Head & face
    ctx.fillStyle = '#fde047'; // hair
    ctx.fillRect(x + 5, y + 1, 6, 3);
    ctx.fillStyle = '#fed7aa'; // skin
    ctx.fillRect(x + 5, y + 3, 6, 3);

    // Eyes direction
    ctx.fillStyle = '#0f172a';
    if (dir === 2) { // Down
      ctx.fillRect(x + 6, y + 4, 1, 1);
      ctx.fillRect(x + 9, y + 4, 1, 1);
    } else if (dir === 4) { // Left
      ctx.fillRect(x + 5, y + 4, 1, 1);
    } else if (dir === 6) { // Right
      ctx.fillRect(x + 10, y + 4, 1, 1);
    }

    // Legs / Pants with step animation
    ctx.fillStyle = pantColor;
    const legOffset = frame % 2 === 1 ? 1 : 0;
    ctx.fillRect(x + 5, y + 11, 2, 3 - legOffset);
    ctx.fillRect(x + 9, y + 11, 2, 3 + legOffset);
  }

  private drawDialogWindow(ctx: CanvasRenderingContext2D) {
    const wx = 12;
    const wy = 152;
    const ww = SCREEN_WIDTH - 24;
    const wh = 76;

    // Classical PS1 RPG translucent blue gradient window
    const grad = ctx.createLinearGradient(wx, wy, wx, wy + wh);
    grad.addColorStop(0, '#02184a');
    grad.addColorStop(1, '#000b24');

    ctx.fillStyle = grad;
    ctx.fillRect(wx, wy, ww, wh);

    // Double frame border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(wx + 0.5, wy + 0.5, ww - 1, wh - 1);
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(wx + 2.5, wy + 2.5, ww - 5, wh - 5);

    // Text rendering with word wrap
    const textToShow = this.dialog.text.slice(0, this.dialog.charIndex);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.textBaseline = 'top';

    const lines = textToShow.split('\n');
    let lineY = wy + 8;
    for (const line of lines) {
      ctx.fillText(line, wx + 10, lineY);
      lineY += 14;
    }

    // Flashing button prompt if fully revealed
    if (this.dialog.charIndex >= this.dialog.text.length && Math.floor(this.frameCount / 20) % 2 === 0) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(wx + ww - 14, wy + wh - 14);
      ctx.lineTo(wx + ww - 8, wy + wh - 14);
      ctx.lineTo(wx + ww - 11, wy + wh - 9);
      ctx.fill();
    }
  }

  public getState(): RuntimeState {
    return {
      currentMapId: this.activeMap?.header.mapId || 1,
      player: { ...this.player },
      camera: { x: this.cameraX, y: this.cameraY },
      dialog: { ...this.dialog },
      switches: [...this.switches],
      variables: [...this.variables],
      arenas: {
        permanent: {
          name: 'g_perm_arena',
          used: this.permUsed,
          capacity: this.permCapacity,
          highWaterMark: this.permHWM,
        },
        scene: {
          name: 'g_scene_arena',
          used: this.sceneUsed,
          capacity: this.sceneCapacity,
          highWaterMark: this.sceneHWM,
        },
        map: {
          name: 'g_map_arena',
          used: this.mapUsed,
          capacity: this.mapCapacity,
          highWaterMark: this.mapHWM,
        },
        scratch: {
          name: 'g_scratch_arena',
          used: this.scratchUsed,
          capacity: this.scratchCapacity,
          highWaterMark: this.scratchHWM,
        },
        io: {
          name: 'g_io_arena',
          used: this.ioUsed,
          capacity: this.ioCapacity,
          highWaterMark: this.ioHWM,
        },
      },
      eventVm: {
        active: this.vmState.active,
        pc: this.vmState.pc,
        eventId: this.vmState.eventId,
        state: this.vmState.state,
        flags: this.vmState.flags,
        currentOpcodeName: this.vmState.currentOpcodeName,
        rawBytecode: this.vmState.code,
      },
      fps: 60,
      frameCounter: this.frameCount,
      activeBuffer: this.activeBuffer,
    };
  }
}
