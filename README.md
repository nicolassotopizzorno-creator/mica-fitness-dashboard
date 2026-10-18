# Mica · Entrenamientos

Dashboard personal para celular publicado mediante GitHub Pages. El historial comienza con cero sesiones porque aún no se recibió la primera captura de Mi Fitness.

## Archivos

- `dist/history.json`: historial canónico y exportable, que actualizan los futuros chats.
- `dist/index.html`, `dist/app.js`, `dist/metrics.js`, `dist/styles.css`: sitio servido por Pages.
- `mica-tablero.html`: copia autónoma del dashboard existente; regenerar con `node scripts/build-standalone.mjs` después de cambiar el JSON.
- `AGENTS.md`: procedimiento para incorporar sesiones sin duplicados.
- `data/history.schema.json` y `data/session-template.json`: contrato extensible y plantilla sin datos reales.
- `.github/workflows/pages.yml`: despliegue automático desde `dist/` al cambiar `main`.

Para registrar una actividad, enviar “Entrenamiento de hoy” con capturas de Mi Fitness y comentarios opcionales en ChatGPT. El asistente lee el JSON actual en GitHub, incorpora la sesión y actualiza el repositorio. No existe conexión directa con Mi Fitness ni sincronización automática con el reloj.

## Datos y visualización

Cada sesión contiene `automatic` para lo legible en Mi Fitness y `manual` para ejercicios, series, pesos, repeticiones, sensación, RPE y contexto que informe el usuario. `manual.exercises` admite cualquier cantidad de ejercicios. Se conservan nombres originales y normalizados por separado; los faltantes quedan en `null` o vacíos. Nuevas métricas pueden añadirse a `extra_metrics` dentro de su fuente.

No se deducen fecha, hora, dispositivo, calorías, FC, zonas ni ejercicios de otras sesiones o del perfil. Duraciones en segundos, FC en lpm y carga en kg conservando el texto original. Puntos de FC solo cuando hay cifras legibles; una curva sin números se guarda como evidencia o descripción. Zonas y efectos mantienen sus etiquetas, límites, escalas y unidades visibles.

Cada entrada de `sets` es una serie o bloque homogéneo con `set_count` explícito. Volumen = series × repeticiones × carga externa total conocida en kg; no se mezclan bases de carga diferentes. Mejor marca = mayor carga anotada en la misma variante y base, sin estimar 1RM. La FC media resumida es el promedio simple de las medias disponibles, con cobertura. Calorías activas y totales se muestran por separado.

Solo aparecen tarjetas con valores disponibles, evoluciones con al menos dos puntos fechados y comparaciones con al menos dos sesiones. Ninguna métrica se interpreta automáticamente como mejora: importan actividad, duración, RPE, sueño, cansancio y contexto.

## Actualización

1. Leer `AGENTS.md` y el JSON actual en GitHub. Revisar hash de captura, fecha, tipo y duración antes de insertar.
2. Actualizar los datos y su registro `audit`, conservando el ID al corregir.
3. Ejecutar `node scripts/validate.mjs`, `node --test tests/metrics.test.js`, `node --check dist/app.js` y `node scripts/build-standalone.mjs`.
4. Subir `dist/history.json`, `mica-tablero.html` y cualquier cambio asociado a `main`; verificar GitHub Pages.

El validador local cubre los términos de JSON Schema utilizados aquí, fechas reales, IDs únicos y referencias al catálogo.

## Privacidad

El repositorio y GitHub Pages son públicos. Los futuros entrenamientos en el JSON y cualquier captura incluida en `dist/evidence/` serán accesibles públicamente. El usuario solicitó publicar el dashboard mediante GitHub Pages.
