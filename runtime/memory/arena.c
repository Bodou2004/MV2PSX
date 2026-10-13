/**
 * MV2PSX Memory Arena Subsystem Implementation
 */

#include "arena.h"

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

    /* Align current offset to requested alignment */
    size_t current = (size_t)(arena->buffer + arena->offset);
    size_t aligned = (current + alignment - 1) & ~(alignment - 1);
    size_t new_offset = aligned - (size_t)arena->buffer;

    if (new_offset + size > arena->capacity) {
        /* Out of memory in this arena */
        return NULL;
    }

    void *ptr = (void*)(arena->buffer + new_offset);
    arena->offset = new_offset + size;

    if (arena->offset > arena->high_water_mark) {
        arena->high_water_mark = arena->offset;
    }

    return ptr;
}

void arena_reset(MemoryArena *arena) {
    arena->offset = 0;
}

size_t arena_get_used(const MemoryArena *arena) {
    return arena->offset;
}

size_t arena_get_high_water_mark(const MemoryArena *arena) {
    return arena->high_water_mark;
}
