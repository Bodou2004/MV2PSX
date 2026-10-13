/**
 * MV2PSX Joypad Controller Input Abstraction
 */

#ifndef MVPSX_PAD_H
#define MVPSX_PAD_H

#include "../core/types.h"

void pad_init(void);
void pad_poll(void);
uint16_t pad_get_buttons(void);
bool pad_button_down(uint16_t button);
bool pad_button_pressed(uint16_t button);

#endif /* MVPSX_PAD_H */
