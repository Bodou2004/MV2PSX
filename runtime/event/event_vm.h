/**
 * MV2PSX Event Virtual Machine
 * Implements Section 9 and Annex A of the technical specification.
 */

#ifndef MVPSX_EVENT_VM_H
#define MVPSX_EVENT_VM_H

#include "../core/types.h"

/* VM execution states */
#define VM_STATE_INACTIVE       0
#define VM_STATE_RUNNING        1
#define VM_STATE_WAIT_FRAMES    2
#define VM_STATE_WAIT_UI        3
#define VM_STATE_TRANSFER       4

/* Opcodes matching Annex A */
#define OP_END                  0x00
#define OP_TEXT                 0x01
#define OP_CHOICE               0x02
#define OP_SET_SWITCH           0x03
#define OP_SET_VAR              0x04
#define OP_VAR_OP               0x05
#define OP_TEST                 0x06
#define OP_JZ                   0x07
#define OP_JMP                  0x08
#define OP_WAIT                 0x09
#define OP_TRANSFER             0x0A
#define OP_PLAY_SE              0x0B
#define OP_PLAY_BGM             0x0C
#define OP_COMMON               0x0D
#define OP_ITEM_ADD             0x0E
#define OP_BATTLE               0x0F
#define OP_NATIVE_CALL          0x10

/* Event VM State structure (Section 9.2) */
typedef struct {
    const uint8_t *code;
    uint32_t       pc;
    uint16_t       event_id;
    uint16_t       map_id;
    uint16_t       wait_frames;
    uint8_t        state;
    uint8_t        flags;

    /* Transfer request payload if state == VM_STATE_TRANSFER */
    uint16_t       transfer_map_id;
    uint16_t       transfer_x;
    uint16_t       transfer_y;
    uint8_t        transfer_dir;

    /* Active text request if state == VM_STATE_WAIT_UI */
    uint16_t       active_string_id;
} EventVM;

/* Global state: Switches (bitset) & Variables (int32 array) (Section 10) */
#define MAX_GLOBAL_SWITCHES     512
#define MAX_GLOBAL_VARS         128

extern uint8_t g_switches[MAX_GLOBAL_SWITCHES / 8];
extern int32_t g_variables[MAX_GLOBAL_VARS];

void vm_init(EventVM *vm);
void vm_start(EventVM *vm, const uint8_t *bytecode, uint16_t event_id, uint16_t map_id);
bool vm_step(EventVM *vm);
void vm_resume_from_ui(EventVM *vm);

/* Global state accessors */
bool vm_get_switch(uint16_t switch_id);
void vm_set_switch(uint16_t switch_id, bool value);
int32_t vm_get_var(uint16_t var_id);
void vm_set_var(uint16_t var_id, int32_t value);

#endif /* MVPSX_EVENT_VM_H */
