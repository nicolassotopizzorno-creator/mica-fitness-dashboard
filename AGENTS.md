# Tablero Mica: instrucciones para futuros chats

Este repositorio es la fuente de verdad. GitHub Pages publica dist/ desde main. Antes de escribir, leer siempre la versión actual de dist/history.json, este archivo, README.md y data/history.schema.json en GitHub. La copia local puede estar desactualizada. El repositorio y el sitio son públicos.

## Sesiones individuales

- sessions contiene entrenamientos individuales. Gimnasio por la mañana y Pilates por la tarde son dos sesiones con IDs distintos, incluso si comparten fecha. Nunca sobrescribir una sesión por coincidir el día.
- Antes de crear una sesión, revisar hash de captura si existe, fecha, hora, tipo y duración. La fecha sola no prueba duplicidad. Si el mensaje agrega información a una sesión existente, mantener su ID y actualizarla con un evento audit.
- Si el hash de una captura no está disponible, evidence.sha256 puede ser null; nunca generar uno ficticio.
- automatic contiene exclusivamente datos visibles en capturas de Mi Fitness; manual contiene exclusivamente lo informado por Mica. El dispositivo del perfil no prueba el dispositivo de una sesión. No completar ausencias con cero ni inventar cifras de una curva de FC.
- manual.exercises acepta 0, 1 o muchos ejercicios con series y campos parciales. Conservar nombre original, variante, base de carga, descansos y observaciones sin inferir valores.

## Actividad diaria

- daily_activity es distinta de sessions. Pasos, meta, distancia y futuras métricas generales se guardan en un solo registro por fecha YYYY-MM-DD. Los pasos nunca crean un entrenamiento.
- Si llega un nuevo número de pasos para una fecha existente, actualizar ese registro, conservar la fuente de cada valor y agregar audit. Las fuentes válidas son mi_fitness_screenshot para lo visible en una captura y user_reported para lo declarado. Si “hoy” no se puede resolver con la fecha local del usuario, pedir la fecha.
- Para el resumen diario, agrupar sesiones por fecha sin fusionarlas: cantidad, duración y calorías de actividad sumadas, FC máxima observada. La FC media diaria solo se calcula ponderada por duración cuando todas las sesiones del día tienen duración positiva y FC media conocida.
- Las zonas se acumulan entre sesiones solo si todas tienen los mismos nombres y límites BPM explícitos. No sumar puntuaciones de efecto del entrenamiento. Comparar la última actividad con la anterior del mismo tipo; no equiparar Pilates con gimnasio. Mostrar diferencias sin calificarlas como mejora o empeoramiento.

## Escritura robusta en GitHub

- Si una escritura en GitHub falla por conflicto de versión/SHA o por un error transitorio, volver a leer inmediatamente el archivo actual y su SHA, comprobar que la sesión o el dato no se haya creado en el intento anterior y reintentar una vez de forma segura. No crear duplicados ni dar por perdida la carga sin verificar primero el estado final del repositorio.

## Interfaz y publicación

- Nombre visible: Mica. Vista vertical única, sin filtros de fecha y optimizada para celular. Tarjetas solo con valores reales. Evolución contiene un único gráfico por fecha con selectores Tiempo activo, Sesiones, Pasos y Calorías; cada selector exige al menos dos fechas con datos completos. Para Tiempo activo sumar duraciones de todas las sesiones del día; para Calorías sumar exclusivamente active_calories_kcal, nunca total_calories_kcal. Si falta un valor en alguna sesión, omitir ese día de la serie correspondiente. Los pasos vienen solo de daily_activity. Últimos entrenamientos mantiene cada sesión por separado.
- Bajo Evolución, Último día vs anterior compara los dos días con entrenamientos más recientes. Mostrar cantidad de sesiones y, si existen en ambos días, duración total, pasos y calorías de actividad, con diferencias de signo neutras. El volumen exige series × repeticiones × carga externa total conocida y se marca como parcial cuando corresponde.
- En celular, los tres indicadores de entrenamiento van en una sola fila. Últimos entrenamientos permanece plegado hasta que la persona lo expanda. El gráfico general de Efecto del entrenamiento muestra cada puntuación por sesión; separar tipos, unidades y escalas, sin sumar ni mezclar valores incompatibles.
- Ejecutar node scripts/validate.mjs, node --test tests/metrics.test.js y node --check dist/app.js. Ejecutar node scripts/build-standalone.mjs para regenerar mica-tablero.html después de cambios.
- Subir a main los cambios de dist/, esquema, documentación, pruebas y copia autónoma. Confirmar que el workflow de GitHub Pages termine correctamente y que el sitio muestre la versión nueva. Explicar a Mica los datos registrados, faltantes y comparaciones relevantes.
- Las capturas originales no se suben al repositorio público por defecto. La sesión del 15/10/2026 ya registrada debe permanecer íntegra.
