# MV2PSX - Matriz de Compatibilidad y Plugins

## 1. Política de Plugins JavaScript (Sección 15)
En PlayStation 1 no corre JavaScript ni NW.js. Cada plugin presente en `plugins.js` es clasificado por el `Plugin Analyzer`:

| Estado | Significado | Acción del Compilador |
|---|---|---|
| `SUPPORTED_NATIVE` | Existe un módulo C/C++ equivalente aprobado en `runtime/extensions/` | Activa macro `#define` y enlaza el módulo |
| `COMPILE_TRANSFORM` | El comportamiento se resuelve durante la conversión offline | Modifica datos/bytecode en el host |
| `PARTIAL` | Subconjunto de funciones soportado | Emite warnings detallados de qué métodos se ignoran |
| `NO_EFFECT` | Plugin visual de editor o irrelevante para PS1 | Se descarta limpiamente |
| `UNSUPPORTED` | Modifica APIs complejas de JavaScript sin reemplazo nativo | Bloquea la compilación (`ERROR` / `FATAL`) |

## 2. Fórmulas de Daño y Expresiones (Sección 12.1)
- **Permitido:**
  - Constantes numéricas enteras
  - Parámetros `a.atk, a.def, a.mat, a.mdf, a.agi, a.luk, b.atk, b.def`
  - Operadores `+ - * / %`
  - `min`, `max`, `clamp`
  - Variación pseudoaleatoria controlada
- **No permitido:**
  - JavaScript arbitrario (`eval`, invocación de objetos dinámicos)
  - Llamadas a `window`, `SceneManager` o closures
