# Tablero Mica: instrucciones para futuros chats

Este repositorio es la fuente de verdad del dashboard Mica. GitHub Pages sirve `dist/`; el historial canónico es `dist/history.json`. Cuando el usuario envíe “Entrenamiento de hoy” con capturas de Mi Fitness y comentarios, leer primero la versión actual del JSON en GitHub, actualizarla, validar, guardar un commit en `main` y comprobar la publicación. La conexión GitHub de ChatGPT permite actualizar el archivo desde futuros chats. Leer también `README.md`, `data/history.schema.json` y `data/session-template.json`.

## Registro

1. No crear sesiones sin una actividad real. Antes de insertar, revisar hash SHA-256 de capturas cuando estén disponibles, fecha, tipo de actividad y duración para detectar duplicados. Si el mensaje completa una sesión existente, conservar su `id` y editarla. Ante coincidencia dudosa, guardar los datos seguros y pedir aclaración.
2. `automatic` contiene solo lo visible en capturas de Mi Fitness. `manual` contiene solo lo informado por el usuario. El dispositivo del perfil es declarado por el usuario y no prueba qué reloj registró una sesión. Conservar texto original, nombre original del ejercicio y notas de normalización.
3. Desconocido = `null` o campo ausente. Cero solo indica un cero visible o informado. Mantener precisión de fecha/hora; no inferir hora ni zona. Guardar zonas, efecto y métricas adicionales con sus etiquetas, unidades y escalas originales. Una curva de FC sin valores numéricos legibles se conserva como descripción o captura, nunca como serie exacta estimada.
4. `manual.exercises` admite 0, 1 o muchos ejercicios, con series heterogéneas y campos parciales. No inferir grupos musculares, equipamiento, base de peso, descansos ni repeticiones. Normalizar variantes con cautela sin perder `name_original`.
5. Agregar un evento `audit` al crear o corregir. No borrar datos previos sin una corrección trazable.

## Publicación y análisis

- Ejecutar `node scripts/validate.mjs`, `node --test tests/metrics.test.js`, `node --check dist/app.js` y `node scripts/build-standalone.mjs`. Actualizar las pruebas solo si cambia el comportamiento. Incluir `dist/history.json` y la copia autónoma `mica-tablero.html` en el commit.
- Un cambio en `dist/**` en `main` activa el workflow de Pages. Confirmar el despliegue antes de afirmar que la web está actualizada.
- Mostrar tarjetas solo con datos reales y evoluciones solo con al menos dos puntos fechados. El volumen requiere series × repeticiones × carga externa total conocida; indicar si es parcial. No sumar calorías activas con totales.
- Al comparar, considerar actividad, duración, RPE, sueño, molestias, cansancio y contexto. Una FC menor, más calorías o una puntuación distinta no prueba mejora por sí sola.
- Explicar qué quedó registrado y qué sigue desconocido.

El repositorio y GitHub Pages son públicos. El JSON y cualquier captura que se suba a `dist/evidence/` serán visibles públicamente. El usuario pidió expresamente GitHub Pages. No volver a usar Sites ni crear otro repositorio.
