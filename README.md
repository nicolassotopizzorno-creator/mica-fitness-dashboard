# Mica · Mi actividad

Dashboard móvil de entrenamientos y movimiento publicado en GitHub Pages. La sesión funcional del 15/10/2026 sigue en el historial.

## Estructura

- dist/history.json: historial canónico y exportable.
- dist/index.html, dist/app.js, dist/metrics.js, dist/styles.css: sitio publicado.
- mica-tablero.html: copia autónoma regenerable con node scripts/build-standalone.mjs.
- data/history.schema.json: contrato de datos v1.1.0.
- data/session-template.json y data/daily-template.json: plantillas sin datos reales.
- AGENTS.md: instrucciones para futuras actualizaciones desde ChatGPT.

La colección sessions guarda entrenamientos individuales. Cada actividad tiene ID y detalle propio, aun cuando haya varias el mismo día. La colección daily_activity guarda una sola entrada por fecha para pasos, meta, distancia y futuras métricas diarias. Cada valor diario identifica su fuente: Mi Fitness cuando se ve en una captura o user_reported cuando lo informa Mica. Si cambian los pasos de un día, se actualiza la entrada existente y su auditoría.

Los datos automáticos de una sesión proceden solo de capturas Mi Fitness; ejercicios, pesos, series, repeticiones, RPE, sensaciones y contexto son manuales. El esquema admite cero, uno o muchos ejercicios por sesión y campos parciales. Se mantienen nombres originales y normalizados. Las cifras faltantes quedan vacías o en null, nunca se inventan.

Los gráficos diarios agrupan sesiones por fecha para sumar duración y calorías de actividad, contar entrenamientos y tomar la mayor FC máxima observada. La FC media diaria solo aparece ponderada por duración si todas las sesiones del día tienen duración y FC media válidas. Las zonas se suman únicamente con los mismos nombres y límites BPM explícitos. Los efectos del entrenamiento se muestran por actividad, sin sumarlos. El volumen requiere series × repeticiones × carga externa total en kg conocida; otras bases de carga no se mezclan.

La portada muestra días activos, sesiones, horas y últimos pasos cuando los datos existen. Después presenta actividades y tiempo por día. Los pasos diarios muestran su meta cuando se conoce. Las comparaciones usan la actividad anterior del mismo tipo y los dos días activos más recientes, con diferencias descriptivas. Las tendencias de fuerza, esfuerzo y constancia aparecen cuando hay historial suficiente. Un descanso no se presenta como una “racha perdida”.

## Actualizar

1. Leer AGENTS.md y la versión actual de dist/history.json en GitHub. Comparar hash de captura, fecha, hora, tipo y duración antes de insertar o corregir una sesión.
2. Mantener separados sessions y daily_activity, con fuentes por campo y un evento audit para cada cambio.
3. Ejecutar node scripts/validate.mjs, node --test tests/metrics.test.js, node --check dist/app.js y node scripts/build-standalone.mjs.
4. Subir cambios a main y verificar el workflow de Pages y la URL publicada.

El validador incluido cubre los términos de JSON Schema usados por el proyecto, fechas reales, IDs únicos y un solo registro diario por fecha.

## Privacidad

El repositorio y GitHub Pages son públicos. Los datos publicados en el JSON son visibles para cualquiera con la URL. Las capturas originales no se suben por defecto; la sesión del 15/10 conserva su hash y transcripción.
