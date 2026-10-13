/**
 * MV2PSX PS1 Runtime - Core Types
 * Follows Section 24 Conventions:
 * - Fixed-width integers (uint8_t, uint16_t, uint32_t, int32_t)
 * - No floats in gameplay, integer & fixed-point math
 */

#ifndef MVPSX_TYPES_H
#define MVPSX_TYPES_H

#include <stdint.h>
#include <stddef.h>
#include <stdbool.h>

#ifndef NULL
#define NULL ((void*)0)
#endif

/* Screen resolution profile: 320x240 NTSC */
#define SCREEN_WIDTH        320
#define SCREEN_HEIGHT       240
#define TILE_SIZE           16
#define SCREEN_TILES_X      (SCREEN_WIDTH / TILE_SIZE)   /* 20 tiles */
#define SCREEN_TILES_Y      (SCREEN_HEIGHT / TILE_SIZE)  /* 15 tiles */

/* Fixed point (12.4) helpers for smooth camera & sprite movement without floats */
typedef int32_t fixed_t;
#define FIXED_SHIFT         4
#define TO_FIXED(x)         ((fixed_t)((x) << FIXED_SHIFT))
#define FROM_FIXED(x)       ((x) >> FIXED_SHIFT)

/* Joypad buttons bitmask */
#define PAD_UP              (1 << 0)
#define PAD_DOWN            (1 << 1)
#define PAD_LEFT            (1 << 2)
#define PAD_RIGHT           (1 << 3)
#define PAD_CROSS           (1 << 4)   /* Action / Confirm */
#define PAD_CIRCLE          (1 << 5)   /* Cancel / Menu */
#define PAD_SQUARE          (1 << 6)
#define PAD_TRIANGLE        (1 << 7)
#define PAD_START           (1 << 8)
#define PAD_SELECT          (1 << 9)

#endif /* MVPSX_TYPES_H */
