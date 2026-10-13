/**
 * MV2PSX Joypad Controller Input Implementation
 */

#include "pad.h"

static uint16_t s_pad_state = 0;
static uint16_t s_pad_prev = 0;

#if defined(PSN00BSDK)
#include <psxpad.h>

static uint8_t s_pad_buff[2][34];

void pad_init(void) {
    InitPAD(&s_pad_buff[0][0], 34, &s_pad_buff[1][0], 34);
    StartPAD();
}

void pad_poll(void) {
    s_pad_prev = s_pad_state;
    s_pad_state = 0;

    PADTYPE *pad = (PADTYPE*)&s_pad_buff[0][0];
    if (pad->stat == 0 && (pad->type == 0x4 || pad->type == 0x5 || pad->type == 0x7)) {
        uint16_t raw = (uint16_t)(~pad->btn);
        /* Map PSn00bSDK pad flags to MVPSX PAD_* bitmasks */
        if (raw & 0x1000) s_pad_state |= PAD_UP;
        if (raw & 0x4000) s_pad_state |= PAD_DOWN;
        if (raw & 0x8000) s_pad_state |= PAD_LEFT;
        if (raw & 0x2000) s_pad_state |= PAD_RIGHT;
        if (raw & 0x0040) s_pad_state |= PAD_CROSS;
        if (raw & 0x0020) s_pad_state |= PAD_CIRCLE;
        if (raw & 0x0080) s_pad_state |= PAD_SQUARE;
        if (raw & 0x0010) s_pad_state |= PAD_TRIANGLE;
        if (raw & 0x0800) s_pad_state |= PAD_START;
        if (raw & 0x0100) s_pad_state |= PAD_SELECT;
    }
}

#else
/* Host stub */
void pad_init(void) { s_pad_state = 0; s_pad_prev = 0; }
void pad_poll(void) { s_pad_prev = s_pad_state; }
#endif

uint16_t pad_get_buttons(void) {
    return s_pad_state;
}

bool pad_button_down(uint16_t button) {
    return (s_pad_state & button) != 0;
}

bool pad_button_pressed(uint16_t button) {
    return (s_pad_state & button) && !(s_pad_prev & button);
}
