/**
 * MV2PSX Intermediate Representation (IR) Types
 * Defined in accordance with Sections 4.1, 4.2, and 7.1 of the MV2PSX Architecture.
 */

export interface SystemData {
  gameTitle: string;
  versionId: number;
  startMapId: number;
  startX: number;
  startY: number;
  partyMembers?: number[];
  switches: string[];
  variables: string[];
  tileSize?: number;
}

export interface MVEventCommand {
  code: number;
  indent: number;
  parameters: any[];
}

export interface MVEventPage {
  conditions: {
    actorId?: number;
    actorValid?: boolean;
    itemId?: number;
    itemValid?: boolean;
    selfSwitchCh?: string;
    selfSwitchValid?: boolean;
    switch1Id?: number;
    switch1Valid?: boolean;
    switch2Id?: number;
    switch2Valid?: boolean;
    variableId?: number;
    variableValid?: boolean;
    variableValue?: number;
  };
  image: {
    characterIndex: number;
    characterName: string;
    direction: number;
    pattern: number;
    tileId?: number;
  };
  list: MVEventCommand[];
  moveFrequency?: number;
  moveRoute?: any;
  moveSpeed?: number;
  moveType?: number;
  priorityType: number; // 0: below, 1: same, 2: above
  stepAnime?: boolean;
  through?: boolean;
  trigger: number; // 0: action, 1: player touch, 2: event touch, 3: autorun, 4: parallel
  walkAnime?: boolean;
}

export interface MVEvent {
  id: number;
  name: string;
  x: number;
  y: number;
  pages: MVEventPage[];
}

export interface TilesetData {
  id: number;
  name: string;
  mode: number;
  tilesetNames: string[];
  flags: number[];
  note?: string;
}

export interface MVMapData {
  displayName?: string;
  width: number;
  height: number;
  tilesetId: number;
  data: number[];
  events: (MVEvent | null)[];
  autoplayBgm?: boolean;
  bgm?: { name: string; pan: number; pitch: number; volume: number };
}

export interface FeatureSet {
  useText: boolean;
  useChoices: boolean;
  useSwitches: boolean;
  useVariables: boolean;
  useTransfer: boolean;
  usePictures: boolean;
  useBattle: boolean;
  useShop: boolean;
  useAudioSe: boolean;
  useAudioBgm: boolean;
  maxSwitchId: number;
  maxVariableId: number;
}

export interface CompiledEventBytecode {
  eventId: number;
  pageIndex: number;
  trigger: number;
  priority: number;
  x: number;
  y: number;
  graphicId: number;
  conditionSwitchId: number;
  bytecode: Uint8Array;
}

export interface CompiledMapBinary {
  mapId: number;
  buffer: Uint8Array;
  header: {
    magic: string;
    version: number;
    mapId: number;
    width: number;
    height: number;
    tilesetId: number;
    layerCount: number;
    flags: number;
    eventCount: number;
    tileDataOff: number;
    passDataOff: number;
    eventTableOff: number;
    stringsOff: number;
    fileSize: number;
  };
  events: CompiledEventBytecode[];
  strings: string[];
}

export interface MemoryReportItem {
  sceneName: string;
  mapId: number;
  mapBytes: number;
  eventsBytes: number;
  stringsBytes: number;
  runtimeResidentBytes: number;
  globalDataBytes: number;
  cdAudioBufferBytes: number;
  spritesScratchBytes: number;
  safetyReserveBytes: number;
  totalEstimatedRamBytes: number;
  ramBudgetLimitBytes: number;
  estimatedVramBytes: number;
  vramBudgetLimitBytes: number;
  status: 'OK' | 'WARNING' | 'ERROR';
  suggestions: string[];
}

export interface BuildReport {
  projectName: string;
  timestamp: string;
  features: FeatureSet;
  featuresHeader: string;
  mapsCompiled: number;
  memoryReports: MemoryReportItem[];
  worstScene: MemoryReportItem;
  warnings: string[];
  errors: string[];
}
