/**
 * MV2PSX Event Virtual Machine Implementation
 */

#include "event_vm.h"

uint8_t g_switches[(MAX_GLOBAL_SWITCHES + 7) / 8];
int32_t g_variables[MAX_GLOBAL_VARS];

void vm_init(EventVM *vm) {
    vm->code = NULL;
    vm->pc = 0;
    vm->event_id = 0;
    vm->map_id = 0;
    vm->wait_frames = 0;
    vm->state = VM_STATE_INACTIVE;
    vm->flags = 0;
    vm->transfer_map_id = 0;
    vm->transfer_x = 0;
    vm->transfer_y = 0;
    vm->transfer_dir = 0;
    vm->active_string_id = 0;
}

void vm_start(EventVM *vm, const uint8_t *bytecode, uint16_t event_id, uint16_t map_id) {
    vm->code = bytecode;
    vm->pc = 0;
    vm->event_id = event_id;
    vm->map_id = map_id;
    vm->wait_frames = 0;
    vm->state = (bytecode != NULL) ? VM_STATE_RUNNING : VM_STATE_INACTIVE;
    vm->flags = 0;
}

static inline uint16_t read_u16(const uint8_t *p) {
    return (uint16_t)(p[0] | (p[1] << 8));
}

static inline int16_t read_s16(const uint8_t *p) {
    return (int16_t)(p[0] | (p[1] << 8));
}

static inline int32_t read_s32(const uint8_t *p) {
    return (int32_t)(p[0] | (p[1] << 8) | (p[2] << 16) | (p[3] << 24));
}

bool vm_step(EventVM *vm) {
    if (vm->state == VM_STATE_INACTIVE) {
        return false;
    }

    if (vm->state == VM_STATE_WAIT_FRAMES) {
        if (vm->wait_frames > 0) {
            vm->wait_frames--;
            return true;
        }
        vm->state = VM_STATE_RUNNING;
    }

    if (vm->state == VM_STATE_WAIT_UI || vm->state == VM_STATE_TRANSFER) {
        /* Paused awaiting UI completion or map transfer */
        return true;
    }

    while (vm->state == VM_STATE_RUNNING) {
        uint8_t op = vm->code[vm->pc++];

        switch (op) {
            case OP_END:
                vm->state = VM_STATE_INACTIVE;
                return false;

            case OP_TEXT: {
                uint16_t str_id = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                vm->active_string_id = str_id;
                vm->state = VM_STATE_WAIT_UI;
                return true;
            }

            case OP_SET_SWITCH: {
                uint16_t sw_id = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                uint8_t val = vm->code[vm->pc++];
                vm_set_switch(sw_id, val != 0);
                break;
            }

            case OP_SET_VAR: {
                uint16_t var_id = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                int32_t val = read_s32(&vm->code[vm->pc]);
                vm->pc += 4;
                vm_set_var(var_id, val);
                break;
            }

            case OP_VAR_OP: {
                uint16_t var_id = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                uint8_t op_type = vm->code[vm->pc++];
                int32_t rhs = read_s32(&vm->code[vm->pc]);
                vm->pc += 4;
                int32_t cur = vm_get_var(var_id);
                switch (op_type) {
                    case 1: cur += rhs; break;
                    case 2: cur -= rhs; break;
                    case 3: cur *= rhs; break;
                    case 4: if (rhs != 0) cur /= rhs; break;
                    case 5: if (rhs != 0) cur %= rhs; break;
                }
                vm_set_var(var_id, cur);
                break;
            }

            case OP_TEST: {
                uint8_t kind = vm->code[vm->pc++];
                uint16_t id = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                int32_t val = read_s32(&vm->code[vm->pc]);
                vm->pc += 4;

                bool cond = false;
                if (kind == 0) { // Switch
                    cond = (vm_get_switch(id) == (val != 0));
                } else if (kind == 1) { // Var equal
                    cond = (vm_get_var(id) == val);
                }
                vm->flags = cond ? 1 : 0;
                break;
            }

            case OP_JZ: {
                int16_t rel = read_s16(&vm->code[vm->pc]);
                vm->pc += 2;
                if ((vm->flags & 1) == 0) {
                    vm->pc += rel;
                }
                break;
            }

            case OP_JMP: {
                int16_t rel = read_s16(&vm->code[vm->pc]);
                vm->pc += 2;
                vm->pc += rel;
                break;
            }

            case OP_WAIT: {
                uint16_t frames = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                vm->wait_frames = frames;
                vm->state = VM_STATE_WAIT_FRAMES;
                return true;
            }

            case OP_TRANSFER: {
                vm->transfer_map_id = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                vm->transfer_x = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                vm->transfer_y = read_u16(&vm->code[vm->pc]);
                vm->pc += 2;
                vm->transfer_dir = vm->code[vm->pc++];
                vm->state = VM_STATE_TRANSFER;
                return true;
            }

            default:
                /* Unknown opcode, terminate defensively */
                vm->state = VM_STATE_INACTIVE;
                return false;
        }
    }

    return true;
}

void vm_resume_from_ui(EventVM *vm) {
    if (vm->state == VM_STATE_WAIT_UI) {
        vm->state = VM_STATE_RUNNING;
    }
}

bool vm_get_switch(uint16_t switch_id) {
    if (switch_id == 0 || switch_id >= MAX_GLOBAL_SWITCHES) return false;
    uint16_t byte_idx = switch_id / 8;
    uint8_t bit_idx = switch_id % 8;
    return (g_switches[byte_idx] & (1 << bit_idx)) != 0;
}

void vm_set_switch(uint16_t switch_id, bool value) {
    if (switch_id == 0 || switch_id >= MAX_GLOBAL_SWITCHES) return;
    uint16_t byte_idx = switch_id / 8;
    uint8_t bit_idx = switch_id % 8;
    if (value) {
        g_switches[byte_idx] |= (1 << bit_idx);
    } else {
        g_switches[byte_idx] &= ~(1 << bit_idx);
    }
}

int32_t vm_get_var(uint16_t var_id) {
    if (var_id == 0 || var_id >= MAX_GLOBAL_VARS) return 0;
    return g_variables[var_id];
}

void vm_set_var(uint16_t var_id, int32_t value) {
    if (var_id == 0 || var_id >= MAX_GLOBAL_VARS) return;
    g_variables[var_id] = value;
}
