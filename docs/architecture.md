# MV2PSX - Arquitectura Técnica y Especificación

Basado en la especificación técnica de MV2PSX v0.1.

## 1. Principio Rector
> **Hacer costosa la compilación en PC para que la ejecución en PS1 sea simple, predecible y barata en memoria.**

La PlayStation 1 (comercial) dispone de:
- **2 MB de RAM principal**
- **1 MB de VRAM** (1024x512 en 16-bit framebuffer/texturas/CLUT)
- **CPU MIPS R3000A a ~33.9 MHz**
- **CD-ROM** con velocidad de transferencia y latencia de búsqueda mecánica
- **SPU** con 512 KB de Sound RAM

### Decisiones Fundamentales
1. **Sin JSON en target:** RPG Maker MV guarda datos en JSON pesados y dispersos. El host (PC) transforma todo en formatos binarios empaquetados (`MAP.BIN`, `TEXT.BIN`, `EVENTS.BIN`).
2. **Sin JavaScript en target:** No se embebe Duktape ni V8. Los scripts de eventos se compilan a bytecode compacto para una máquina virtual especializada (**Event VM**).
3. **Gestión de memoria mediante Arenas:** Cero `malloc`/`free` indiscriminados durante gameplay. Cambiar de mapa o escena resetea la `Map Arena` o `Scene Arena` en $O(1)$.
4. **Culling y VRAM administrada:** Renderizado exclusivo de tiles visibles (ventana de 320x240, 20x15 tiles de 16x16 o proporción adaptada).
5. **Generación condicional de runtime:** Link-time feature stripping con macros `#define MVPSX_USE_*` para no enlazar código no utilizado.
