/**
 * MV2PSX PS1 GPU Abstraction
 * Implements Section 2.2, Section 5, and Section 7.3
 * Double-buffering 320x240, Ordering Table, and Primitive Rendering
 */

#ifndef MVPSX_GPU_H
#define MVPSX_GPU_H

#include "../core/types.h"

#define OT_LEN          16
#define PRIM_BUFF_LEN   (32 * 1024)

void gpu_init(void);
void gpu_begin(void);
void gpu_draw_tile(int16_t screen_x, int16_t screen_y, uint16_t tile_id);
void gpu_draw_player(int16_t screen_x, int16_t screen_y, uint8_t dir);
void gpu_flip(void);
uint8_t gpu_get_active_buffer(void);

#endif /* MVPSX_GPU_H */
