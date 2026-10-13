/**
 * MV2PSX PS1 GPU Implementation
 * Real PSn00bSDK drawing routines and double buffering
 */

#include "gpu.h"

#if defined(__PSX__) || defined(PSX)
#include <psxgpu.h>
#include <psxetc.h>

static DISPENV disp[2];
static DRAWENV draw[2];
static u_long  ot[2][OT_LEN];
static char    prim_buff[2][PRIM_BUFF_LEN];
static char   *next_prim;
static int     db = 0;

void gpu_init(void) {
    ResetGraph(0);
    SetGraphDebug(0);

    /* 320x240 NTSC Double-buffering setup (Section 2.2) */
    SetDefDrawEnv(&draw[0], 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    SetDefDispEnv(&disp[0], 0, SCREEN_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT);
    SetDefDrawEnv(&draw[1], 0, SCREEN_HEIGHT, SCREEN_WIDTH, SCREEN_HEIGHT);
    SetDefDispEnv(&disp[1], 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    draw[0].isbg = 1;
    setRGB0(&draw[0], 10, 10, 16);
    draw[1].isbg = 1;
    setRGB0(&draw[1], 10, 10, 16);

    PutDrawEnv(&draw[0]);
    PutDispEnv(&disp[0]);

    db = 0;
    next_prim = prim_buff[db];
}

void gpu_begin(void) {
    ClearOTagR(ot[db], OT_LEN);
}

void gpu_draw_tile(int16_t screen_x, int16_t screen_y, uint16_t tile_id) {
    if (tile_id == 0) return;
    if (screen_x < -TILE_SIZE || screen_x >= SCREEN_WIDTH ||
        screen_y < -TILE_SIZE || screen_y >= SCREEN_HEIGHT) return;

    if (next_prim + sizeof(TILE) >= prim_buff[db] + PRIM_BUFF_LEN) {
        return; /* Primitive buffer overflow protection */
    }

    TILE *tile = (TILE*)next_prim;
    next_prim += sizeof(TILE);

    setTile(tile);
    setXY0(tile, screen_x, screen_y);
    setWH(tile, TILE_SIZE, TILE_SIZE);

    /* Tile colors matching MAP.BIN tiles */
    switch (tile_id) {
        case 1: setRGB0(tile, 45, 90, 39);    break; /* Grass / meadow */
        case 2: setRGB0(tile, 71, 85, 105);   break; /* Mountain perimeter */
        case 3: setRGB0(tile, 120, 113, 108); break; /* Cobblestone */
        case 4: setRGB0(tile, 185, 28, 28);   break; /* House roof */
        case 5: setRGB0(tile, 30, 41, 59);    break; /* Sanctuary wall */
        case 6: setRGB0(tile, 15, 23, 42);    break; /* Sanctuary floor */
        case 7: setRGB0(tile, 56, 189, 248);  break; /* Pillar */
        default: setRGB0(tile, 40, 40, 50);   break;
    }

    addPrim(ot[db] + 2, tile);
}

void gpu_draw_player(int16_t screen_x, int16_t screen_y, uint8_t dir) {
    (void)dir;
    if (next_prim + sizeof(TILE) >= prim_buff[db] + PRIM_BUFF_LEN) {
        return;
    }

    TILE *player = (TILE*)next_prim;
    next_prim += sizeof(TILE);

    setTile(player);
    setXY0(player, screen_x + 2, screen_y + 2);
    setWH(player, TILE_SIZE - 4, TILE_SIZE - 4);
    setRGB0(player, 239, 68, 68); /* Red hero sprite */

    addPrim(ot[db] + 1, player);
}

void gpu_flip(void) {
    DrawSync(0);
    VSync(0);
    PutDrawEnv(&draw[db]);
    PutDispEnv(&disp[db]);
    DrawOTag(ot[db] + OT_LEN - 1);
    db = !db;
    next_prim = prim_buff[db];
}

uint8_t gpu_get_active_buffer(void) {
    return (uint8_t)db;
}

#else
/* Host PC fallback simulation stubs */
static uint8_t s_db = 0;
void gpu_init(void) {}
void gpu_begin(void) {}
void gpu_draw_tile(int16_t screen_x, int16_t screen_y, uint16_t tile_id) { (void)screen_x; (void)screen_y; (void)tile_id; }
void gpu_draw_player(int16_t screen_x, int16_t screen_y, uint8_t dir) { (void)screen_x; (void)screen_y; (void)dir; }
void gpu_flip(void) { s_db = !s_db; }
uint8_t gpu_get_active_buffer(void) { return s_db; }
#endif
