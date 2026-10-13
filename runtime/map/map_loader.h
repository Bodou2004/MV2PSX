/**
 * MV2PSX Map Loader and Tilemap Management
 * Adheres to Section 7.1, 7.2, 7.3 and Section 6.1 (Map Arena lifecycle)
 */

#ifndef MVPSX_MAP_LOADER_H
#define MVPSX_MAP_LOADER_H

#include "../core/types.h"
#include "../memory/arena.h"

/* Header struct strictly matching Section 7.1 */
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

typedef struct {
    uint16_t id;
    int16_t  x;
    int16_t  y;
    uint8_t  trigger;
    uint8_t  priority;
    uint16_t graphic_id;
    uint16_t condition_switch_id;
    uint32_t bytecode_off;
    uint16_t bytecode_len;
} __attribute__((packed)) MapEventDesc;

typedef struct {
    MapHeader          header;
    const uint16_t    *tile_data;
    const uint8_t     *pass_data;
    const MapEventDesc*events;
    const uint8_t     *raw_buffer;
} LoadedMap;

extern LoadedMap g_active_map;

/* Map lifecycle */
void map_unload(void);
bool map_load_from_memory(const uint8_t *file_data, size_t file_size);
bool map_is_passable(int16_t x, int16_t y, uint8_t dir);
int16_t map_get_event_at(int16_t x, int16_t y);
const char* map_get_string(uint16_t string_id);

#endif /* MVPSX_MAP_LOADER_H */
