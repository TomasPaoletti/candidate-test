# Decisiones Técnicas

> Documenta aquí las decisiones importantes que tomes durante el desarrollo.
> Esta documentación es parte de la evaluación.

## Información del Candidato

- **Nombre:** Tomás Paoletti
- **Fecha:** [Fecha]
- **Tiempo dedicado:** [Horas totales]

---

## Decisiones de Arquitectura

### 1. Modelo de OpenAI utilizado

**Contexto:** El README menciona usar `gpt-5-mini` o `gpt-4` para las respuestas.
**Opciones consideradas:**

1. `gpt-5-mini`: Mencionado en README pero no existe en la API de OpenAI
2. `gpt-4`: Modelo potente pero costoso

**Decisión:** Utilizar `gpt-4`

**Consecuencias:** Balance óptimo entre calidad de respuestas y costo. Respuestas suficientemente buenas para un asistente educativo sin impacto significativo en presupuesto de API. Utilizar `gpt-5-mini` implica si o si temperatura de 1, y no me parece algo bueno para estudiantes

### 2. Manejo de excepciones personalizadas

**Contexto:** NestJS recomienda usar HttpException para manejo de errores HTTP, pero el código inicial usaba `Error` genérico.

**Opciones consideradas:**

1. Mantener `throw new Error()` genérico
2. Usar `HttpException` directamente en cada lugar
3. Crear excepciones personalizadas que extiendan `HttpException`

**Decisión:** Crear excepciones personalizadas en `exceptions/ai.exceptions.ts`

**Consecuencias:** Código más limpio y mantenible. Códigos HTTP semánticamente correctos. Mejor experiencia para el cliente con respuestas estructuradas. Facilita testing.

### 3. Inicialización de OpenAI

**Contexto:** El servicio podía inicializarse sin API key configurada, fallando solo en runtime al llamar métodos.

**Opciones consideradas:**

1. Validar API key en cada método
2. Permitir servicio sin OpenAI y fallar
3. Lanzar excepción en constructor si falta API key

**Decisión:** Lanzar excepción en constructor si falta API key

**Consecuencias:** Errores de configuración se detectan inmediatamente al iniciar la aplicación, no en runtime.

### 4. Retry logic

**Contexto:** Las APIs externas pueden fallar temporalmente por rate limits o problemas de servidor.

**Opciones consideradas:**

1. No reintentar, fallar inmediatamente
2. Reintentar con delay fijo
3. Reintentar con exponential backoff (2s, 4s, 8s)

**Decisión:** 3 reintentos con exponential backoff, solo para errores 429 y 5xx

**Consecuencias:** Mayor resiliencia ante fallos temporales. Previene saturar el servicio con reintentos agresivos. Errores permanentes (401, 400) fallan rápido sin reintentos innecesarios.

---

### 5. Límite de historial de conversación

**Contexto:** Sin límite, conversaciones largas pueden exceder el límite de contexto de OpenAI (128k tokens) y aumentar costos exponencialmente.

**Opciones consideradas:**

1. Enviar historial completo (sin límite)
2. Límite de 5 mensajes
3. Límite de 10 mensajes

**Decisión:** Limitar a 10 mensajes más recientes

**Consecuencias:** Previene exceder límites de tokens. Reduce costos significativamente. 10 mensajes son suficientes para mantener contexto conversacional relevante sin perder coherencia.

### 6. Modelo de embeddings para RAG

**Contexto:** Elegir modelo de OpenAi para embeber el texto.

**Opciones consideradas:**

1. `text-embedding-3-small` (1536 dimensiones, $0.02/1M tokens)
2. `text-embedding-3-large` (3072 dimensiones, $0.13/1M tokens)

**Decisión:** Usar `text-embedding-3-small`

**Consecuencias:** Menor costo. Performance adecuada para búsqueda con el scope del proyecto (5 PDFs). Fácilmente upgradeable a large si se requiere mayor precisión en el futuro.

### 7. Similitud coseno (minScore)

**Contexto:** La búsqueda necesita un score mínimo para filtrar resultados irrelevantes. El README sugería 0.7 como estándar.

**Opciones consideradas:**

1. `minScore = 0.7` (muy restrictivo)
2. `minScore = 0.6` (moderado)
3. `minScore = 0.5` (balanceado)
4. `minScore = 0.4` (permisivo)

**Decisión:** Usar `minScore = 0.5`

**Consecuencias:** Mayor recall sin sacrificar significativamente la precisión. Testing demostró que 0.7 rechaza chunks relevantes (ej: pregunta "¿Qué son los objetos en JavaScript?" con chunks de score 0.54-0.56 que contenían exactamente la información buscada).

### 8. Tamaño de chunks para indexación

**Contexto:** Los documentos PDF deben dividirse en chunks para crear embeddings efectivos.

**Opciones consideradas:**

1. Chunks fijos de 500 caracteres
2. Chunks fijos de 1000 caracteres
3. Chunks fijos de 2000 caracteres

**Decisión:** Chunks de ~1000 caracteres

**Consecuencias:** Embeddings más precisos y semánticamente coherentes. 1000 caracteres ≈ 250 tokens (tamaño óptimo según documentación OpenAI). La división por oraciones preserva contexto semántico completo.

### 9. Estrategia de idempotencia en indexación

**Contexto:** Al re-indexar un PDF actualizado, necesitamos decidir qué hacer con los chunks existentes.

**Opciones consideradas:**

1. Permitir duplicados (insertar siempre)
2. Verificar hash del contenido antes de insertar
3. Eliminar todos los chunks del curso antes de indexar
4. Eliminar solo chunks del mismo archivo (granular)

**Decisión:** Eliminar chunks del mismo `sourceFile` antes de indexar

**Consecuencias:** Permite actualizar PDFs individuales sin afectar otros archivos del mismo curso. Evita duplicados sin complejidad de hash checking.

### 10. Metadata en respuestas del chat

**Contexto:** Las respuestas del chat necesitan indicar si usaron RAG o no para observabilidad y debugging.

**Opciones consideradas:**

1. No agregar metadata adicional
2. Agregar solo flag booleano `usedRAG`
3. Agregar `usedRAG` + `relevantChunks` + otros campos

**Decisión:** Agregar campos `usedRAG` (boolean) y `relevantChunks` (number) en metadata

**Consecuencias:** Mayor observabilidad del sistema. Facilita debugging (¿por qué no usó RAG?). Posibilita métricas y A/B testing futuro de parámetros RAG. Bajo overhead (solo 2 campos adicionales).

---

### 2. Streaming de respuestas (SSE vs WebSocket)

**Contexto:** [...]

**Opciones consideradas:**

1. Server-Sent Events (SSE)
2. WebSocket

**Decisión:** [...]

**Consecuencias:** [...]

---

## Bug Encontrado

### Ubicación

- **Archivo:** [Ruta del archivo]
- **Línea(s):** [Números de línea]
- **Método:** [Nombre del método]

### Descripción del Bug

[Explica qué hace mal el código]

### Causa Raíz

[Explica por qué ocurre el bug]

### Solución Propuesta

```typescript
// Código corregido
```

### Cómo lo descubriste

[Explica el proceso de debugging]

---

## Suposiciones Realizadas

1. **[Suposición]:** [Justificación]
2. **[Suposición]:** [Justificación]

---

## Mejoras Futuras

Si tuviera más tiempo, implementaría:

1. **Tracking de errores de indexación**: Guardar chunks fallidos como registros separados en MongoDB con metadata del error (mensaje, timestamp, preview del contenido). Esto permitiría:
   - Reintento selectivo de chunks específicos
   - Análisis de patrones de fallo
   - Debugging más efectivo en producción

---

## Dificultades Encontradas

### [Dificultad 1]

- **Problema:** [Descripción]
- **Solución:** [Cómo lo resolviste]
- **Tiempo invertido:** [Estimación]

---

## Notas Adicionales

[Cualquier otra información relevante]
