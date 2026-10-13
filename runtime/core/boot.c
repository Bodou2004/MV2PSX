/**
 * MV2PSX PS1 Runtime - Boot & Main Game Loop
 * Architecture v0.1 - Vertical Slice M0 to M2 (PSn00bSDK & DuckStation Target)
 *
 * Implements:
 * - Arena initializations (Section 6.1)
 * - GPU 320x240 double-buffering init (Section 2.2)
 * - Joypad polling (Section 5)
 * - MAP.BIN loading into Map Arena (Section 7.1)
 * - Tile culling and rendering (Section 7.3)
 * - Player movement and passability collision (Section 7.2)
 */

#include "types.h"
#include "../memory/arena.h"
#include "../map/map_loader.h"
#include "../event/event_vm.h"
#include "../gfx/gpu.h"
#include "../input/pad.h"
#include "../data/map001_bin.h"

/* Memory Arena backing buffers (Resident in 2 MB RAM) (Section 2.1) */
static uint8_t s_perm_buffer[128 * 1024];    /* Permanent Arena: 128 KB */
static uint8_t s_scene_buffer[256 * 1024];   /* Scene Arena: 256 KB */
static uint8_t s_map_buffer[512 * 1024];     /* Map Arena: 512 KB */
static uint8_t s_scratch_buffer[128 * 1024]; /* Frame Scratch: 128 KB */
static uint8_t s_io_buffer[128 * 1024];      /* CD IO Buffer: 128 KB */

/* Player State */
static int16_t s_player_x = 9;
static int16_t s_player_y = 10;
static uint8_t s_player_dir = 2; // 2: Down, 4: Left, 6: Right, 8: Up
static uint8_t s_move_cooldown = 0;

/* Camera Coordinates */
static int16_t s_camera_x = 0;
static int16_t s_camera_y = 0;

/* Main Event VM instance */
static EventVM s_main_vm;

static void update_camera(void) {
    if (g_active_map.header.width == 0 || g_active_map.header.height == 0) return;

    int16_t map_pixel_w = g_active_map.header.width * TILE_SIZE;
    int16_t map_pixel_h = g_active_map.header.height * TILE_SIZE;

    int16_t target_cx = (s_player_x * TILE_SIZE) - (SCREEN_WIDTH / 2) + (TILE_SIZE / 2);
    int16_t target_cy = (s_player_y * TILE_SIZE) - (SCREEN_HEIGHT / 2) + (TILE_SIZE / 2);

    if (map_pixel_w <= SCREEN_WIDTH) {
        target_cx = (map_pixel_w - SCREEN_WIDTH) / 2;
    } else {
        if (target_cx < 0) target_cx = 0;
        if (target_cx > map_pixel_w - SCREEN_WIDTH) target_cx = map_pixel_w - SCREEN_WIDTH;
    }

    if (map_pixel_h <= SCREEN_HEIGHT) {
        target_cy = (map_pixel_h - SCREEN_HEIGHT) / 2;
    } else {
        if (target_cy < 0) target_cy = 0;
        if (target_cy > map_pixel_h - SCREEN_HEIGHT) target_cy = map_pixel_h - SCREEN_HEIGHT;
    }

    s_camera_x = target_cx;
    s_camera_y = target_cy;
}

static void update_player(void) {
    if (s_move_cooldown > 0) {
        s_move_cooldown--;
        return;
    }

    int16_t dx = 0;
    int16_t dy = 0;
    uint8_t new_dir = s_player_dir;

    if (pad_button_down(PAD_UP)) {
        dy = -1;
        new_dir = 8;
    } else if (pad_button_down(PAD_DOWN)) {
        dy = 1;
        new_dir = 2;
    } else if (pad_button_down(PAD_LEFT)) {
        dx = -1;
        new_dir = 4;
    } else if (pad_button_down(PAD_RIGHT)) {
        dx = 1;
        new_dir = 6;
    }

    if (dx != 0 || dy != 0) {
        s_player_dir = new_dir;
        int16_t target_x = s_player_x + dx;
        int16_t target_y = s_player_y + dy;

        /* Collision test using packed pass_data (Section 7.2) */
        if (map_is_passable(target_x, target_y, 0)) {
            s_player_x = target_x;
            s_player_y = target_y;
            s_move_cooldown = 10; /* Movement cooldown: ~6 steps per second */
        }
    }
}

static void render_scene(void) {
    gpu_begin();

    if (g_active_map.header.width > 0 && g_active_map.header.height > 0) {
        int16_t width = g_active_map.header.width;
        int16_t height = g_active_map.header.height;
        uint8_t layer_count = g_active_map.header.layer_count;

        /* Section 7.3: Culling rectangle calculation */
        int16_t visible_x0 = s_camera_x / TILE_SIZE;
        int16_t visible_y0 = s_camera_y / TILE_SIZE;
        int16_t visible_x1 = visible_x0 + SCREEN_TILES_X + 1;
        int16_t visible_y1 = visible_y0 + SCREEN_TILES_Y + 1;

        if (visible_x0 < 0) visible_x0 = 0;
        if (visible_y0 < 0) visible_y0 = 0;
        if (visible_x1 > width) visible_x1 = width;
        if (visible_y1 > height) visible_y1 = height;

        /* Draw visible tiles across all layers */
        for (uint8_t l = 0; l < layer_count; l++) {
            size_t layer_offset = (size_t)l * width * height;
            for (int16_t ty = visible_y0; ty < visible_y1; ty++) {
                for (int16_t tx = visible_x0; tx < visible_x1; tx++) {
                    size_t cell_idx = layer_offset + ((size_t)ty * width + tx);
                    uint16_t tile_id = g_active_map.tile_data[cell_idx];
                    if (tile_id == 0) continue;

                    int16_t screen_x = tx * TILE_SIZE - s_camera_x;
                    int16_t screen_y = ty * TILE_SIZE - s_camera_y;
                    gpu_draw_tile(screen_x, screen_y, tile_id);
                }
            }
        }

        /* Draw Player Sprite Quad */
        int16_t player_screen_x = s_player_x * TILE_SIZE - s_camera_x;
        int16_t player_screen_y = s_player_y * TILE_SIZE - s_camera_y;
        gpu_draw_player(player_screen_x, player_screen_y, s_player_dir);
    }

    gpu_flip();
}

int main(void) {
    /* 1. Initialize Memory Arenas (Section 6.1) */
    arena_init(&g_perm_arena, s_perm_buffer, sizeof(s_perm_buffer), "perm");
    arena_init(&g_scene_arena, s_scene_buffer, sizeof(s_scene_buffer), "scene");
    arena_init(&g_map_arena, s_map_buffer, sizeof(s_map_buffer), "map");
    arena_init(&g_scratch_arena, s_scratch_buffer, sizeof(s_scratch_buffer), "scratch");
    arena_init(&g_io_arena, s_io_buffer, sizeof(s_io_buffer), "io");

    /* 2. Initialize Hardware Subsystems */
    gpu_init();
    pad_init();
    vm_init(&s_main_vm);

    /* 3. Load Initial Map into g_map_arena (Section 7.1) */
    map_load_from_memory(g_map001_bin, g_map001_bin_size);

    /* 4. Set Initial Player Coordinates from System.json */
    s_player_x = 9;
    s_player_y = 10;
    s_player_dir = 2;
    update_camera();

    /* 5. Main Execution Loop (60 FPS) */
    while (1) {
        pad_poll();
        update_player();
        update_camera();
        render_scene();
    }

    return 0;
}
