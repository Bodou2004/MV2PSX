#!/usr/bin/env bash
# MV2PSX - Build script for PSn00bSDK and DuckStation
set -e

if [ -z "$PSN00BSDK_DIR" ]; then
    echo "ERROR: La variable de entorno PSN00BSDK_DIR no está definida."
    echo "Ejemplo: export PSN00BSDK_DIR=/opt/psn00bsdk"
    exit 1
fi

TOOLCHAIN_FILE="${PSN00BSDK_DIR}/lib/libpsn00b/cmake/sdk.cmake"

if [ ! -f "$TOOLCHAIN_FILE" ]; then
    echo "ERROR: No se encontró el archivo toolchain en: $TOOLCHAIN_FILE"
    exit 1
fi

echo "=== Configurando proyecto MV2PSX con CMake ==="
cmake -S runtime -B build \
    -DCMAKE_TOOLCHAIN_FILE="$TOOLCHAIN_FILE" \
    -DCMAKE_BUILD_TYPE=Release

echo "=== Compilando ejecutable y generando imagen BIN/CUE ==="
cmake --build build

echo "=== Compilación exitosa ==="
echo "Artefactos generados:"
echo " - build/game.elf"
echo " - build/game.exe"
echo " - build/game.map"
echo " - build/game.bin"
echo " - build/game.cue"
