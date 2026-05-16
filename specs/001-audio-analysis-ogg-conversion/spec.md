# Feature Specification: Audio Analysis & OGG Conversion

**Feature Branch**: `001-audio-analysis-ogg-conversion`

**Created**: 2026-05-15

**Status**: Draft

**Input**: Herramienta para cargar audio, detectar BPM/offset, convertir a `.ogg` y exportar JSON de configuración para Dead As Disco.

## User Scenarios & Testing

### User Story 1 - Cargar y analizar un archivo de audio (Priority: P1)

El usuario selecciona un archivo de audio desde su sistema, la aplicación lo decodifica y analiza automáticamente mostrando el BPM detectado, la posición del primer beat (offset), y la duración total.

**Why this priority**: Es la funcionalidad principal. Sin carga ni análisis no hay nada más que hacer.

**Independent Test**: Seleccionar un archivo WAV mono de 44100Hz con BPM conocido (ej. 120 BPM, 4/4). Verificar que el BPM detectado tiene margen de error < 2% y que `beatOffset` es un valor coherente.

**Acceptance Scenarios**:

1. **Given** un archivo de audio válido (MP3, WAV, FLAC, OGG, M4A), **When** el usuario lo selecciona, **Then** el audio se decodifica y se muestran BPM, offset, duración y nombre de canción.
2. **Given** un archivo corrupto o no soportado, **When** el usuario lo selecciona, **Then** se muestra un mensaje de error claro indicando el problema.
3. **Given** un archivo de audio muy largo (> 10 min), **When** se inicia el análisis, **Then** se procesa sin bloquear la UI (Web Worker) y se muestran los resultados.

---

### User Story 2 - Convertir audio a OGG y exportar configuración (Priority: P1)

El usuario puede convertir el audio cargado a formato `.ogg` y generar el archivo JSON de configuración que el juego necesita, con opción de ajustar manualmente BPM y offset antes de exportar.

**Why this priority**: Sin conversión y exportación la aplicación no cumple su propósito.

**Independent Test**: Cargar un archivo WAV, ajustar BPM a 124 y offset a 50ms, exportar. Verificar que el `.ogg` se reproduce correctamente y el JSON contiene `{"tempo": 124, "beatOffset": 50}`.

**Acceptance Scenarios**:

1. **Given** un audio analizado, **When** el usuario hace clic en "Convertir y exportar", **Then** se descargan un archivo `.ogg` y un `.json` con la configuración.
2. **Given** los valores detectados automáticamente, **When** el usuario modifica BPM u offset manualmente, **Then** los cambios se reflejan en el JSON exportado.
3. **Given** la conversión a OGG, **When** se completa, **Then** el archivo `.ogg` resultante tiene la misma duración y calidad de audio que el original.

---

### User Story 3 - Preview de audio con beats marcados (Priority: P2)

El usuario puede reproducir el audio cargado y escuchar los beats detectados marcados con un clic o señal audible para verificar visual y auditivamente que el BPM y offset son correctos.

**Why this priority**: Mejora la confianza en los resultados antes de exportar, pero no es crítica para el MVP.

**Independent Test**: Cargar un audio con ritmo constante, reproducir con beats marcados, verificar que los clics coinciden auditivamente con el tempo de la canción.

**Acceptance Scenarios**:

1. **Given** un audio analizado, **When** el usuario pulsa "Reproducir", **Then** se escucha el audio y se ven marcadores visuales en cada beat.
2. **Given** la reproducción activa, **When** el usuario ajusta el offset, **Then** los marcadores se recolocan en tiempo real.

---

### Edge Cases

- **Audio sin ritmo claro** (silencio, ruido blanco, spoken word): el detector debe reportar baja confianza y permitir ajuste manual obligatorio.
- **Archivos con metadatos** (artista, título): deben extraerse del audio y precargarse en el JSON como `performedBy` y `songName`.
- **Cambios de tempo**: `customTempoSections` debe poder poblarse si se detectan variaciones significativas.
- **Estéreo vs mono**: el análisis debe hacer downmix a mono internamente sin afectar la conversión final que puede ser estéreo.
- **Sample rates no estándar** (8000Hz, 96000Hz): deben convertirse a 44100Hz para el análisis.

## Requirements

### Functional Requirements

- **FR-001**: Sistema DEBE cargar y decodificar archivos de audio en formatos MP3, WAV, FLAC, OGG y M4A usando `AudioContext.decodeAudioData()`.
- **FR-002**: Sistema DEBE detectar BPM usando `@libraz/libsonare` con margen de error < 2% en audio musical con ritmo definido.
- **FR-003**: Sistema DEBE calcular `beatOffset` como el tiempo en milisegundos del primer beat detectado.
- **FR-004**: Sistema DEBE permitir al usuario ajustar manualmente BPM y offset antes de exportar.
- **FR-005**: Sistema DEBE convertir el audio a `.ogg` Vorbis usando `@audio/encode-ogg`.
- **FR-006**: Sistema DEBE generar un JSON de configuración con el schema exacto del juego: `version`, `uniqueId`, `songName`, `performedBy`, `writtenBy`, `seed`, `tempo`, `customTempoSections`, `beatOffset`, `startSongOffset`, `endSongOffset`.
- **FR-007**: Sistema DEBE ejecutar todo el procesamiento en cliente (100% offline, sin subida a servidor).
- **FR-008**: Sistema DEBE usar un Web Worker para el análisis de BPM para no bloquear la UI.
- **FR-009**: Sistema DEBE extraer metadatos del archivo (artista, título) para precargar `songName` y `performedBy`.
- **FR-010**: Sistema DEBE mostrar un indicador de progreso durante la conversión a OGG.
- **FR-011**: Sistema DEBE generar un `uniqueId` numérico aleatorio (seed-based) para cada canción si no se provee uno.

### Key Entities

- **AudioFile**: Representa el archivo cargado por el usuario. Contiene el `File` original, el `AudioBuffer` decodificado, formato de origen, duración, sample rate.
- **AnalysisResult**: Resultado del análisis. Contiene `bpm` (number), `beatOffset` (number, ms), `confidence` (number, 0-1), `beats` (array de tiempos en segundos).
- **SongConfig**: Configuración exportable compatible con Dead As Disco. Contiene todos los campos del schema del juego (`version`, `uniqueId`, `songName`, `performedBy`, `writtenBy`, `seed`, `tempo`, `customTempoSections`, `beatOffset`, `startSongOffset`, `endSongOffset`).
- **ExportResult**: Resultado de exportación. Contiene el `Blob` del `.ogg` y el `SongConfig` listo para descargar como `.json`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: BPM detectado con error < 2% en audio musical con ritmo definido (validado con 10 canciones de prueba de BPM conocido).
- **SC-002**: Offset del primer beat calculado con precisión de ±10ms vs. anotación manual.
- **SC-003**: Conversión a OGG completada en < 5 segundos para una canción de 5 minutos.
- **SC-004**: JSON exportado pasa validación contra el schema del juego (todos los campos requeridos presentes y tipos correctos).
- **SC-005**: Usuario puede completar el flujo completo (cargar → analizar → ajustar → exportar) en < 30 segundos para archivos de hasta 10MB.

## Assumptions

- El usuario tiene los archivos de audio en su sistema local.
- El navegador soporta Web Audio API y WebAssembly (todos los navegadores modernos).
- Dead As Disco espera archivos `.ogg` Vorbis a 44100Hz.
- No se requiere login, autenticación, ni backend.
- Los formatos MP3, WAV, FLAC, OGG y M4A cubren > 95% de los casos de uso.
- `uniqueId` se genera como un número aleatorio de 10 dígitos si el usuario no lo especifica.
- `seed` se genera aleatoriamente si no se provee.
