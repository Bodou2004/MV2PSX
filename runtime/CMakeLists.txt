# MV2PSX PSn00bSDK CMake Build Configuration
# Adheres to Section 5.1 (Link-time feature stripping) and Section 18 (PSn00bSDK integration)
# Targets: MIPS R3000A, PS-X EXE format, mkpsxiso BIN/CUE generation

cmake_minimum_required(VERSION 3.21)
project(MV2PSX_GAME C)

set(CMAKE_C_STANDARD 99)

# Include directories for MV2PSX core subsystems
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/core
    ${CMAKE_CURRENT_SOURCE_DIR}/memory
    ${CMAKE_CURRENT_SOURCE_DIR}/map
    ${CMAKE_CURRENT_SOURCE_DIR}/event
    ${CMAKE_CURRENT_SOURCE_DIR}/gfx
    ${CMAKE_CURRENT_SOURCE_DIR}/input
    ${CMAKE_CURRENT_SOURCE_DIR}/data
    ${CMAKE_CURRENT_SOURCE_DIR}/ui
    ${CMAKE_CURRENT_SOURCE_DIR}/../generated
)

# Core resident sources (Section 5)
set(CORE_SOURCES
    core/boot.c
    memory/arena.c
    map/map_loader.c
    event/event_vm.c
    gfx/gpu.c
    input/pad.c
    data/map001_bin.c
)

# Check if running under PSn00bSDK MIPS toolchain
if(COMMAND psn00bsdk_add_executable)
    # 1. Create PS1 executable target with GP-relative addressing (GPREL)
    # psn00bsdk_add_executable() automatically links standard PSn00bSDK libraries
    psn00bsdk_add_executable(game GPREL ${CORE_SOURCES})

    # 3. Copy mkpsxiso configuration and boot descriptor into binary directory
    configure_file(${CMAKE_CURRENT_SOURCE_DIR}/system.cnf ${CMAKE_CURRENT_BINARY_DIR}/system.cnf COPYONLY)
    configure_file(${CMAKE_CURRENT_SOURCE_DIR}/iso.xml ${CMAKE_CURRENT_BINARY_DIR}/iso.xml COPYONLY)

    # 4. Generate bootable CD image (game.bin / game.cue) via mkpsxiso
    if(COMMAND psn00bsdk_add_cd_image)
        psn00bsdk_add_cd_image(game_cd game ${CMAKE_CURRENT_BINARY_DIR}/iso.xml DEPENDS game)
    endif()
else()
    # Host PC native compilation / test harness fallback
    add_executable(game.elf ${CORE_SOURCES})
endif()
