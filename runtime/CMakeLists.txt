# MV2PSX PSn00bSDK CMake Build Configuration
# Adheres to Section 5.1 (Link-time feature stripping) and Section 18 (PSn00bSDK integration)

cmake_minimum_required(VERSION 3.15)
project(MV2PSX_GAME C)

set(CMAKE_C_STANDARD 99)

# Include generated features configuration
include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}
    ${CMAKE_CURRENT_SOURCE_DIR}/core
    ${CMAKE_CURRENT_SOURCE_DIR}/memory
    ${CMAKE_CURRENT_SOURCE_DIR}/map
    ${CMAKE_CURRENT_SOURCE_DIR}/event
    ${CMAKE_CURRENT_SOURCE_DIR}/gfx
    ${CMAKE_CURRENT_SOURCE_DIR}/ui
    ${CMAKE_CURRENT_SOURCE_DIR}/../generated
)

# Core resident sources (Section 5)
set(CORE_SOURCES
    core/boot.c
    memory/arena.c
    map/map_loader.c
    event/event_vm.c
)

add_executable(game.elf ${CORE_SOURCES})

# Target link libraries for PSn00bSDK
target_link_libraries(game.elf PRIVATE psx_gpu psx_etc psx_cd psx_spu)

# PSn00bSDK CD-ROM image generation (Section 18)
# If running under PSn00bSDK toolchain:
if(COMMAND psn00bsdk_add_cd_image)
    psn00bsdk_add_cd_image(game_cd
        TARGET game.elf
        CUE "game.cue"
        BIN "game.bin"
        SYSTEM_CNF "system.cnf"
    )
endif()
