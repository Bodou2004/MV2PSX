import { CompiledMapBinary, BuildReport } from '../../tools/mv2psx/ir/types.ts';

export interface PlayerState {
  x: number; // tile coordinates
  y: number;
  dir: 2 | 4 | 6 | 8; // 2: Down, 4: Left, 6: Right, 8: Up
  isMoving: boolean;
  moveProgress: number; // 0 to 1
  animFrame: number;
}

export interface DialogState {
  isOpen: boolean;
  text: string;
  stringId: number;
  charIndex: number; // for typewriter effect
}

export interface ArenaStats {
  name: string;
  used: number;
  capacity: number;
  highWaterMark: number;
}

export interface VRAMRegion {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bpp: 4 | 8 | 16;
  desc: string;
  color: string;
}

export interface RuntimeState {
  currentMapId: number;
  player: PlayerState;
  camera: { x: number; y: number };
  dialog: DialogState;
  switches: boolean[];
  variables: number[];
  arenas: {
    permanent: ArenaStats;
    scene: ArenaStats;
    map: ArenaStats;
    scratch: ArenaStats;
    io: ArenaStats;
  };
  eventVm: {
    active: boolean;
    pc: number;
    eventId: number;
    state: 'INACTIVE' | 'RUNNING' | 'WAIT_FRAMES' | 'WAIT_UI' | 'TRANSFER';
    flags: number;
    currentOpcodeName: string;
    rawBytecode: Uint8Array;
  };
  fps: number;
  frameCounter: number;
  activeBuffer: 'A' | 'B';
}
