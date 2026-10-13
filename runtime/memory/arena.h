/**
 * MV2PSX Memory Arena Subsystem
 * Follows Section 6.1 & 6.2 of the technical specification.
 * Zero fragmentation via linear chunk allocation and O(1) resets.
 */

#ifndef MVPSX_ARENA_H
#define MVPSX_ARENA_H

#include "../core/types.h"

typedef struct {
    uint8_t  *buffer;
    size_t    capacity;
    size_t    offset;
    size_t    high_water_mark;
    const char *name;
} MemoryArena;

/* Global system arenas */
extern MemoryArena g_perm_arena;
extern MemoryArena g_scene_arena;
extern MemoryArena g_map_arena;
extern MemoryArena g_scratch_arena;
extern MemoryArena g_io_arena;

/* Arena lifecycle operations */
void   arena_init(MemoryArena *arena, void *buffer, size_t capacity, const char *name);
void*  arena_alloc(MemoryArena *arena, size_t size, size_t alignment);
void   arena_reset(MemoryArena *arena);
size_t arena_get_used(const MemoryArena *arena);
size_t arena_get_high_water_mark(const MemoryArena *arena);

#endif /* MVPSX_ARENA_H */
