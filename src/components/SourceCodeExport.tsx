import React, { useState } from 'react';
import { Code2, Copy, Check, Download, FolderGit2 } from 'lucide-react';

export const SourceCodeExport: React.FC = () => {
  const [activeFile, setActiveFile] = useState('types.h');
  const [copied, setCopied] = useState(false);

  const files: Record<string, { path: string; language: string; content: string }> = {
    'types.h': {
      path: 'runtime/core/types.h',
      language: 'c',
      content: `#ifndef MVPSX_TYPES_H
#define MVPSX_TYPES_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#define SCREEN_WIDTH        320
#define SCREEN_HEIGHT       240
#define TILE_SIZE           16
#define SCREEN_TILES_X      (SCREEN_WIDTH / TILE_SIZE)
#define SCREEN_TILES_Y      (SCREEN_HEIGHT / TILE_SIZE)

/* Fixed-point (12.4) helpers (sin floats) */
typedef int32_t fixed_t;
#define FIXED_SHIFT         4
#define TO_FIXED(x)         ((fixed_t)((x) << FIXED_SHIFT))
#define FROM_FIXED(x)       ((x) >> FIXED_SHIFT)

/* Joypad buttons bitmask */
#define PAD_UP              (1 << 0)
#define PAD_DOWN            (1 << 1)
#define PAD_LEFT            (1 << 2)
#define PAD_RIGHT           (1 << 3)
#define PAD_CROSS           (1 << 4)
#define PAD_CIRCLE          (1 << 5)

#endif /* MVPSX_TYPES_H */`,
    },
    'arena.h': {
      path: 'runtime/memory/arena.h',
      language: 'c',
      content: `#ifndef MVPSX_ARENA_H
#define MVPSX_ARENA_H

#include "../core/types.h"

typedef struct {
    uint8_t  *buffer;
    size_t    capacity;
    size_t    offset;
    size_t    high_water_mark;
    const char *name;
} MemoryArena;

extern MemoryArena g_perm_arena;
extern MemoryArena g_scene_arena;
extern MemoryArena g_map_arena;
extern MemoryArena g_scratch_arena;
extern MemoryArena g_io_arena;

void   arena_init(MemoryArena *arena, void *buffer, size_t capacity, const char *name);
void*  arena_alloc(MemoryArena *arena, size_t size, size_t alignment);
void   arena_reset(MemoryArena *arena);
size_t arena_get_used(const MemoryArena *arena);
size_t arena_get_high_water_mark(const MemoryArena *arena);

#endif /* MVPSX_ARENA_H */`,
    },
    'arena.c': {
      path: 'runtime/memory/arena.c',
      language: 'c',
      content: `#include "arena.h"

MemoryArena g_perm_arena;
MemoryArena g_scene_arena;
MemoryArena g_map_arena;
MemoryArena g_scratch_arena;
MemoryArena g_io_arena;

void arena_init(MemoryArena *arena, void *buffer, size_t capacity, const char *name) {
    arena->buffer = (uint8_t*)buffer;
    arena->capacity = capacity;
    arena->offset = 0;
    arena->high_water_mark = 0;
    arena->name = name;
}

void* arena_alloc(MemoryArena *arena, size_t size, size_t alignment) {
    if (alignment == 0) alignment = 4;
    size_t current = (size_t)(arena->buffer + arena->offset);
    size_t aligned = (current + alignment - 1) & ~(alignment - 1);
    size_t new_offset = aligned - (size_t)arena->buffer;

    if (new_offset + size > arena->capacity) return NULL;

    void *ptr = (void*)(arena->buffer + new_offset);
    arena->offset = new_offset + size;
    if (arena->offset > arena->high_water_mark) {
        arena->high_water_mark = arena->offset;
    }
    return ptr;
}

void arena_reset(MemoryArena *arena) {
    arena->offset = 0;
}`,
    },
    'event_vm.h': {
      path: 'runtime/event/event_vm.h',
      language: 'c',
      content: `#ifndef MVPSX_EVENT_VM_H
#define MVPSX_EVENT_VM_H

#include "../core/types.h"

#define VM_STATE_INACTIVE       0
#define VM_STATE_RUNNING        1
#define VM_STATE_WAIT_FRAMES    2
#define VM_STATE_WAIT_UI        3
#define VM_STATE_TRANSFER       4

#define OP_END                  0x00
#define OP_TEXT                 0x01
#define OP_CHOICE               0x02
#define OP_SET_SWITCH           0x03
#define OP_SET_VAR              0x04
#define OP_VAR_OP               0x05
#define OP_TEST                 0x06
#define OP_JZ                   0x07
#define OP_JMP                  0x08
#define OP_WAIT                 0x09
#define OP_TRANSFER             0x0A

typedef struct {
    const uint8_t *code;
    uint32_t       pc;
    uint16_t       event_id;
    uint16_t       map_id;
    uint16_t       wait_frames;
    uint8_t        state;
    uint8_t        flags;
    uint16_t       transfer_map_id;
    uint16_t       transfer_x;
    uint16_t       transfer_y;
    uint8_t        transfer_dir;
    uint16_t       active_string_id;
} EventVM;

void vm_init(EventVM *vm);
void vm_start(EventVM *vm, const uint8_t *bytecode, uint16_t event_id, uint16_t map_id);
bool vm_step(EventVM *vm);
void vm_resume_from_ui(EventVM *vm);

#endif /* MVPSX_EVENT_VM_H */`,
    },
    'map_loader.h': {
      path: 'runtime/map/map_loader.h',
      language: 'c',
      content: `#ifndef MVPSX_MAP_LOADER_H
#define MVPSX_MAP_LOADER_H

#include "../core/types.h"
#include "../memory/arena.h"

typedef struct {
    char     magic[4];          /* "MVM1" */
    uint16_t version;
    uint16_t map_id;
    uint16_t width;
    uint16_t height;
    uint16_t tileset_id;
    uint8_t  layer_count;
    uint8_t  flags;
    uint16_t event_count;
    uint32_t tile_data_off;
    uint32_t pass_data_off;
    uint32_t event_table_off;
    uint32_t strings_off;
    uint32_t file_size;
} __attribute__((packed)) MapHeader;

void map_unload(void);
bool map_load_from_memory(const uint8_t *file_data, size_t file_size);
bool map_is_passable(int16_t x, int16_t y, uint8_t dir);

#endif /* MVPSX_MAP_LOADER_H */`,
    },
    'boot.c': {
      path: 'runtime/core/boot.c',
      language: 'c',
      content: `#include "types.h"
#include "../memory/arena.h"
#include "../map/map_loader.h"
#include "../event/event_vm.h"
#include "../gfx/gpu.h"
#include "../input/pad.h"
#include "../data/map001_bin.h"

static uint8_t s_perm_buffer[128 * 1024];
static uint8_t s_scene_buffer[256 * 1024];
static uint8_t s_map_buffer[512 * 1024];
static uint8_t s_scratch_buffer[128 * 1024];
static uint8_t s_io_buffer[128 * 1024];

int main(void) {
    arena_init(&g_perm_arena, s_perm_buffer, sizeof(s_perm_buffer), "perm");
    arena_init(&g_scene_arena, s_scene_buffer, sizeof(s_scene_buffer), "scene");
    arena_init(&g_map_arena, s_map_buffer, sizeof(s_map_buffer), "map");
    arena_init(&g_scratch_arena, s_scratch_buffer, sizeof(s_scratch_buffer), "scratch");
    arena_init(&g_io_arena, s_io_buffer, sizeof(s_io_buffer), "io");

    gpu_init();
    pad_init();
    map_load_from_memory(g_map001_bin, g_map001_bin_size);

    while (1) {
        pad_poll();
        update_player();
        render_scene();
    }
    return 0;
}`,
    },
    'gpu.h': {
      path: 'runtime/gfx/gpu.h',
      language: 'c',
      content: `#ifndef MVPSX_GPU_H
#define MVPSX_GPU_H

#include "../core/types.h"

void gpu_init(void);
void gpu_begin(void);
void gpu_draw_tile(int16_t screen_x, int16_t screen_y, uint16_t tile_id);
void gpu_draw_player(int16_t screen_x, int16_t screen_y, uint8_t dir);
void gpu_flip(void);

#endif /* MVPSX_GPU_H */`,
    },
    'pad.h': {
      path: 'runtime/input/pad.h',
      language: 'c',
      content: `#ifndef MVPSX_PAD_H
#define MVPSX_PAD_H

#include "../core/types.h"

void pad_init(void);
void pad_poll(void);
uint16_t pad_get_buttons(void);
bool pad_button_down(uint16_t button);

#endif /* MVPSX_PAD_H */`,
    },
    'CMakeLists.txt': {
      path: 'runtime/CMakeLists.txt',
      language: 'cmake',
      content: `cmake_minimum_required(VERSION 3.15)
project(MV2PSX_GAME C)

set(CMAKE_C_STANDARD 99)

include_directories(
    \${CMAKE_CURRENT_SOURCE_DIR}
    \${CMAKE_CURRENT_SOURCE_DIR}/core
    \${CMAKE_CURRENT_SOURCE_DIR}/memory
    \${CMAKE_CURRENT_SOURCE_DIR}/map
    \${CMAKE_CURRENT_SOURCE_DIR}/event
    \${CMAKE_CURRENT_SOURCE_DIR}/gfx
    \${CMAKE_CURRENT_SOURCE_DIR}/input
    \${CMAKE_CURRENT_SOURCE_DIR}/data
    \${CMAKE_CURRENT_SOURCE_DIR}/../generated
)

set(CORE_SOURCES
    core/boot.c
    memory/arena.c
    map/map_loader.c
    event/event_vm.c
    gfx/gpu.c
    input/pad.c
    data/map001_bin.c
)

add_executable(game.elf \${CORE_SOURCES})
target_link_libraries(game.elf PRIVATE psx_gpu psx_etc psx_cd psx_spu)

if(COMMAND psn00bsdk_add_cd_image)
    psn00bsdk_add_cd_image(game_cd
        TARGET game.elf
        CUE "game.cue"
        BIN "game.bin"
        SYSTEM_CNF "system.cnf"
    )
endif()`,
    },
  };

  const current = files[activeFile] || files['types.h'];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-950/60 border border-blue-800/50 rounded-lg text-blue-400">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Árbol de Fuentes C & PSn00bSDK</h3>
            <p className="text-xs text-slate-400">Archivos fuente listos para compilar en hardware real PS1 y emulador DuckStation</p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado al portapapeles' : 'Copiar Archivo'}
        </button>
      </div>

      {/* File Browser Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* File tabs sidebar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-1 text-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1 mb-1">
            Archivos del Runtime
          </div>
          {Object.keys(files).map((fileName) => (
            <button
              key={fileName}
              onClick={() => setActiveFile(fileName)}
              className={`px-3 py-2 rounded-lg text-left font-mono transition-colors flex items-center justify-between ${
                activeFile === fileName
                  ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <span>{fileName}</span>
              <span className="text-[10px] text-slate-500">{files[fileName].path.split('/')[1] || 'root'}</span>
            </button>
          ))}
        </div>

        {/* Code Content View */}
        <div className="md:col-span-3 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>{current.path}</span>
            <span className="text-[11px] text-slate-500 uppercase">{current.language}</span>
          </div>

          <pre className="p-4 font-mono text-xs text-indigo-300 overflow-x-auto leading-relaxed select-text flex-1 max-h-[500px]">
            {current.content}
          </pre>
        </div>
      </div>
    </div>
  );
};
