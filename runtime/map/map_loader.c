/**
 * MV2PSX Map Loader Implementation
 */

#include "map_loader.h"
#include <string.h>

LoadedMap g_active_map;

void map_unload(void) {
    arena_reset(&g_map_arena);
    memset(&g_active_map, 0, sizeof(LoadedMap));
}

bool map_load_from_memory(const uint8_t *file_data, size_t file_size) {
    if (!file_data || file_size < sizeof(MapHeader)) {
        return false;
    }

    /* Reset map arena completely (Section 6.1) */
    map_unload();

    /* Copy into Map Arena to guarantee safe residency */
    uint8_t *arena_buf = (uint8_t*)arena_alloc(&g_map_arena, file_size, 4);
    if (!arena_buf) {
        return false;
    }
    memcpy(arena_buf, file_data, file_size);

    const MapHeader *hdr = (const MapHeader*)arena_buf;

    /* Verify Magic "MVM1" and version 1 */
    if (hdr->magic[0] != 'M' || hdr->magic[1] != 'V' ||
        hdr->magic[2] != 'M' || hdr->magic[3] != '1' ||
        hdr->version != 1) {
        return false;
    }

    /* Bounds check offsets */
    if (hdr->tile_data_off >= file_size ||
        hdr->pass_data_off >= file_size ||
        hdr->event_table_off >= file_size ||
        hdr->strings_off >= file_size) {
        return false;
    }

    g_active_map.header = *hdr;
    g_active_map.raw_buffer = arena_buf;
    g_active_map.tile_data = (const uint16_t*)(arena_buf + hdr->tile_data_off);
    g_active_map.pass_data = (const uint8_t*)(arena_buf + hdr->pass_data_off);
    g_active_map.events = (const MapEventDesc*)(arena_buf + hdr->event_table_off);

    return true;
}

bool map_is_passable(int16_t x, int16_t y, uint8_t dir) {
    if (x < 0 || x >= g_active_map.header.width ||
        y < 0 || y >= g_active_map.header.height) {
        return false;
    }

    if (!g_active_map.pass_data) return true;

    size_t idx = (size_t)y * g_active_map.header.width + x;
    uint8_t mask = g_active_map.pass_data[idx];

    /* 0x00 is totally blocked */
    if (mask == 0) return false;

    /* Check specific directional bit if provided (1: down, 2: left, 4: right, 8: up) */
    if (dir != 0 && (mask & dir) == 0) {
        return false;
    }

    return true;
}

int16_t map_get_event_at(int16_t x, int16_t y) {
    for (uint16_t i = 0; i < g_active_map.header.event_count; i++) {
        if (g_active_map.events[i].x == x && g_active_map.events[i].y == y) {
            return (int16_t)i;
        }
    }
    return -1;
}

const char* map_get_string(uint16_t string_id) {
    if (!g_active_map.raw_buffer || g_active_map.header.strings_off == 0) {
        return "";
    }

    const uint8_t *p = g_active_map.raw_buffer + g_active_map.header.strings_off;
    uint16_t count = (uint16_t)(p[0] | (p[1] << 8));
    p += 2;

    if (string_id >= count) {
        return "";
    }

    for (uint16_t i = 0; i < count; i++) {
        uint16_t len = (uint16_t)(p[0] | (p[1] << 8));
        p += 2;
        if (i == string_id) {
            return (const char*)p;
        }
        p += len + 1; // skip string bytes and null terminator
    }

    return "";
}
