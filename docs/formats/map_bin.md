# Especificación de MAP.BIN (Versión 1)

El archivo `MAP.BIN` empaqueta la capa de tiles, máscaras de colisión/pasabilidad, tabla de eventos del mapa y cadenas internas locales de forma compacta y directamente direccionable por offsets.

## 1. Estructura del Encabezado (MapHeader) - 38 bytes

```c
typedef struct {
    char     magic[4];          // "MVM1"
    uint16_t version;           // 0x0001
    uint16_t map_id;            // ID del mapa en MV (ej. 1 para Map001)
    uint16_t width;             // Ancho en tiles (ej. 20)
    uint16_t height;            // Alto en tiles (ej. 15)
    uint16_t tileset_id;        // ID del tileset asociado
    uint8_t  layer_count;       // Número de capas (típicamente 2 a 4)
    uint8_t  flags;             // Flags (bit 0: loop horizontal, bit 1: loop vertical)
    uint16_t event_count;       // Cantidad de eventos en este mapa
    uint32_t tile_data_off;     // Offset en bytes al bloque de capas de tiles
    uint32_t pass_data_off;     // Offset al bitfield/matriz de colisiones
    uint32_t event_table_off;   // Offset a la tabla de descriptores de eventos
    uint32_t strings_off;       // Offset a la tabla de cadenas de texto
    uint32_t file_size;         // Tamaño total del archivo binario
} MapHeader;
```

## 2. Bloque de Capas de Tiles (`tile_data`)
- Arreglo plano de `width * height * layer_count` enteros de 16 bits (`uint16_t`).
- Cada entrada indica el índice de tile en el atlas de textura o 0 si está vacío.
- Orden: capa 0 (suelo), capa 1 (decoración baja), capa 2 (elementos altos).

## 3. Bloque de Pasabilidad (`pass_data`)
- Matriz de `width * height` bytes (`uint8_t`), donde cada bit representa una dirección permitida:
  - Bit 0: Abajo (0x01)
  - Bit 1: Izquierda (0x02)
  - Bit 2: Derecha (0x04)
  - Bit 3: Arriba (0x08)
  - Si un valor es 0x0F, se puede caminar en todas direcciones; si es 0x00, es obstáculo sólido.

## 4. Bloque de Eventos (`event_table`)
- Para cada evento (1..`event_count`):
  ```c
  typedef struct {
      uint16_t id;             // ID del evento
      int16_t  x;              // Coordenada X en tiles
      int16_t  y;              // Coordenada Y en tiles
      uint8_t  trigger;        // 0: Botón de acción, 1: Contacto jugador, 2: Contacto evento, 3: Inicio automático, 4: Paralelo
      uint8_t  priority;       // 0: Debajo del personaje, 1: Mismo nivel, 2: Sobre el personaje
      uint16_t graphic_id;     // Sprite / tile gráfico
      uint32_t bytecode_off;   // Offset al bytecode de instrucciones de EventVM
      uint16_t bytecode_len;   // Longitud en bytes del bytecode
  } MapEventDescriptor;
  ```

## 5. Tabla de Cadenas (`strings`)
- Cabecera con `count` (`uint16_t`) seguida de offsets relativos y secuencias UTF-8 terminadas en `\0`.
