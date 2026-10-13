# Especificación de Event VM (Anexo A)

La máquina virtual de eventos de MVPSX ejecuta una secuencia lineal de opcodes empaquetados en un búfer inmutable. El estado del intérprete se define por la estructura:

```c
typedef struct {
    const uint8_t *code;
    uint32_t       pc;
    uint16_t       event_id;
    uint16_t       map_id;
    uint16_t       wait_frames;
    uint8_t        state;          // 0: INACTIVO, 1: EJECUTANDO, 2: ESPERANDO_FRAMES, 3: ESPERANDO_UI, 4: TRANSFER
    uint8_t        flags;          // Bit 0: condición de salto cumplida
} EventVM;
```

## Tabla de Opcodes (Versión 1 - Vertical Slice & Core)

| Hex | Mnemónico | Operandos | Descripción / Semántica |
|---|---|---|---|
| 0x00 | `OP_END` | Ninguno | Termina la ejecución del evento |
| 0x01 | `OP_TEXT` | `u16 string_id` | Muestra ventana de diálogo con la cadena `string_id` y suspende el intérprete hasta que el usuario pulse aceptar |
| 0x02 | `OP_CHOICE` | `u16 choice_block` | Presenta opciones múltiples y guarda el índice seleccionado |
| 0x03 | `OP_SET_SWITCH` | `u16 id, u8 value` | Escribe en el bitset global de switches (0 o 1) |
| 0x04 | `OP_SET_VAR` | `u16 id, s32 value` | Asigna un valor entero con signo de 32 bits a la variable `id` |
| 0x05 | `OP_VAR_OP` | `u16 id, u8 op, s32 rhs` | Operación aritmética (+, -, *, /, %) sobre la variable `id` |
| 0x06 | `OP_TEST` | `u8 kind, u16 id, s32 value` | Evalúa condición (ej: switch encendido, variable igual) y actualiza el flag interno |
| 0x07 | `OP_JZ` | `s16 rel` | Salto relativo en el bytecode si el flag interno es 0 (falso) |
| 0x08 | `OP_JMP` | `s16 rel` | Salto relativo incondicional |
| 0x09 | `OP_WAIT` | `u16 frames` | Suspende la ejecución durante N frames (a 60 fps) |
| 0x0A | `OP_TRANSFER` | `u16 map, u16 x, u16 y, u8 dir` | Solicita transferencia del jugador a otro mapa y coordenadas |
| 0x0B | `OP_PLAY_SE` | `u16 sound_id` | Solicita reproducción de efecto de sonido |
| 0x0C | `OP_PLAY_BGM` | `u16 music_id` | Solicita cambio de pista musical de fondo |
| 0x0D | `OP_COMMON` | `u16 event_id` | Invoca la ejecución de un evento común |
| 0x0E | `OP_ITEM_ADD` | `u16 item, s16 qty` | Modifica el inventario de objetos |
| 0x0F | `OP_BATTLE` | `u16 troop_id` | Solicita transición a la escena de batalla |
| 0x10 | `OP_NATIVE_CALL` | `u16 ext, u16 cmd, u16 args` | Llama a una función nativa registrada en tiempo de compilación |
