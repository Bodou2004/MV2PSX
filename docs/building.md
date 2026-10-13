# Guía de Compilación Nativa de MV2PSX con PSn00bSDK

Este documento describe la ruta de compilación reproducible para generar ejecutables reales de PlayStation 1 (`.elf`, `.exe`) y la imagen de CD-ROM (`.bin`, `.cue`) compatible con **DuckStation** y hardware real.

---

## 1. Requisitos Previos

- **PSn00bSDK** (v0.22+ recomendado con toolchain MIPS `mipsel-none-elf`):
  [Repositorio Oficial de PSn00bSDK](https://github.com/Lameguy64/PSn00bSDK)
- **CMake** 3.15 o superior
- **mkpsxiso** (incluido en las utilidades de PSn00bSDK o instalable por separado)
- **Emulador**: DuckStation o Mednafen

---

## 2. Comandos de Compilación Reproducibles

Desde la raíz del repositorio, ejecuta:

```bash
# 1. Configurar el proyecto apuntando al archivo toolchain sdk.cmake de PSn00bSDK:
cmake -S runtime -B build \
  -DCMAKE_TOOLCHAIN_FILE="${PSN00BSDK_DIR}/lib/libpsn00b/cmake/sdk.cmake" \
  -DCMAKE_BUILD_TYPE=Release

# 2. Compilar el ejecutable MIPS y generar la imagen CD con mkpsxiso:
cmake --build build
```

*(En Windows con PowerShell, sustituye `${PSN00BSDK_DIR}` por `$env:PSN00BSDK_DIR` o la ruta absoluta, ej. `C:/psn00bsdk`).*

---

## 3. Artefactos Generados en `build/`

Tras completar la orden anterior, el directorio `build/` contendrá:

| Artefacto | Descripción |
|---|---|
| `game.elf` | Binario ELF MIPS con símbolos para depuración GDB |
| `game.exe` | Ejecutable de PlayStation con encabezado PS-X de 2048 bytes (0x800) |
| `game.bin` | Imagen de disco CD-ROM (Track 01 Mode 2/Form 1, 2352 bytes/sector) |
| `game.cue` | Hoja CUE describiendo las pistas del disco |

---

## 4. Ejecución en DuckStation

Para arrancar el juego en DuckStation:
1. Abre DuckStation.
2. Selecciona **Archivo $\rightarrow$ Iniciar Imagen de Disco** (`Start Disc Image`).
3. Elige `build/game.cue` (o alternativamente `build/game.exe` mediante **Iniciar Archivo Ejecutable**).
4. El mapa inicial (Aldea de Origen) aparecerá a 320×240 con el jugador en $(9, 10)$ moviéndose con el D-Pad sobre los tiles compilados desde `MAP001.BIN`.
