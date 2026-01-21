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

1. `gpt-5-mini`: Mencionado en README
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

### 11. Gestión de conversaciones mediante parámetros de URL

**Contexto:**

El sistema de chat necesitaba una forma de gestionar múltiples conversaciones y permitir la carga del historial de conversaciones existentes. El desafío era determinar cómo identificar qué conversación está activa y cuándo cargar su historial, sin interferir con la funcionalidad de streaming en tiempo real de nuevas conversaciones.

Inicialmente se intentó manejar el `conversationId` como estado interno del hook `useChat`, actualizándolo automáticamente cuando llegaba del servidor durante el streaming. Sin embargo, esto causaba problemas:

- El historial se cargaba automáticamente incluso en conversaciones nuevas (mostrando un loading innecesario)
- El efecto de "typing" se interrumpía porque el cambio de `conversationId` disparaba una recarga del historial
- La experiencia de usuario era confusa con múltiples estados de carga simultáneos

**Opciones consideradas:**

1. **Estado interno del hook con sincronización automática:**
   - Mantener `conversationId` como estado interno en `useChat`
   - Actualizar automáticamente cuando el servidor retorna el ID en `onStart` del streaming
   - Sincronizar con el componente mediante callbacks o estado compartido
   - **Problema:** Causa race conditions entre streaming y carga de historial

2. **Parámetros de URL (route-based):**
   - Usar React Router para manejar rutas: `/chat` (existente) y `/chat/:conversationId` (nueva)
   - El `conversationId` viene de `useParams()` de la URL
   - La navegación entre conversaciones se hace con `navigate()`
   - El historial solo se carga cuando hay un `conversationId` en la URL

**Decisión:**

Se eligió **usar parámetros de URL (route-based)** para gestionar las conversaciones.

**Consecuencias:**

**Positivas:**

- Experiencia de usuario fluida sin cargas innecesarias
- El streaming funciona sin interrupciones
- Historial de navegación del navegador funciona correctamente
- URLs bookmarkeables y compartibles
- Estado predecible y fácil de debuggear
- Tests más simples y confiables
- Escalable para futuras features (ej: lista de conversaciones en sidebar)

**Negativas:**

- Requiere configuración de rutas en React Router
- Ligeramente más código de setup inicial (rutas + navegación)
- Los tests necesitan mockear `useParams` y `useNavigate`

### 12. Gráfico de distribución por categoría en lugar de actividad semanal

**Contexto:**

El TODO del componente Dashboard solicitaba implementar un "gráfico de actividad semanal". Sin embargo, al analizar el endpoint `/api/stats/:studentId`, este solo provee:

- Tiempo total acumulado por categoría de curso
- Racha de días consecutivos de estudio (un número)
- Promedio de progreso semanal (un porcentaje)

**El problema:** No hay datos de actividad diaria. El backend no registra ni retorna información de cuántas horas se estudió cada día específico.

**Opciones consideradas:**

1. **Simular datos de actividad semanal:**
   - Distribuir el tiempo total entre 7 días de forma aleatoria
   - Usar el `studyStreak` para determinar qué días mostrar actividad
   - **Problema:** Los datos serían ficticios y engañarían al usuario

2. **Implementar gráfico de distribución por categoría:**
   - Mostrar cómo se distribuye el tiempo de estudio entre categorías (Frontend, Backend, etc.)
   - Usar los datos reales disponibles del endpoint
   - Proporcionar información útil y verdadera al estudiante

**Decisión:**

Se eligió **implementar un gráfico de barras de tiempo por categoría** en lugar del gráfico semanal solicitado.

**Razones:**

1. **Integridad de datos:** Preferimos mostrar datos 100% verdaderos que inventar distribuciones temporales ficticias.

2. **Valor para el usuario:** El gráfico de categorías es útil - permite al estudiante ver en qué áreas invierte más tiempo y si hay balance en su aprendizaje.

3. **Honestidad técnica:** En un contexto profesional, es mejor comunicar las limitaciones del sistema que presentar datos simulados como reales.

4. **Extensibilidad:** Si en el futuro el backend implementa tracking diario, el componente `CategoryTimeChart` puede coexistir con un nuevo `WeeklyActivityChart`.

---

### 2. Streaming de respuestas (SSE vs WebSocket)

**Contexto:**

Para implementar el streaming de respuestas del chat de IA, necesitábamos elegir una tecnología que permitiera enviar tokens de texto del servidor al cliente de forma incremental y en tiempo real, proporcionando una experiencia de usuario fluida mientras el modelo de IA genera la respuesta.

**Opciones consideradas:**

1. **Server-Sent Events (SSE):**
   - Comunicación unidireccional (servidor → cliente)
   - Protocolo HTTP estándar
   - API nativa del navegador (`EventSource`)
   - Reconexión automática
   - Más simple de implementar

2. **WebSocket:**
   - Comunicación bidireccional full-duplex
   - Protocolo WS/WSS separado
   - Requiere handshake HTTP inicial
   - Mayor flexibilidad pero más complejo
   - Mejor para aplicaciones en tiempo real bidireccionales

**Decisión:**

Se eligió **Server-Sent Events (SSE)** para implementar el streaming de respuestas del chat.

**Razones:**

1. **Comunicación unidireccional suficiente:** Solo necesitamos enviar tokens del servidor al cliente. El envío de mensajes del usuario se hace mediante peticiones HTTP POST tradicionales, por lo que no necesitamos comunicación bidireccional.

2. **Simplicidad de implementación:** SSE utiliza el protocolo HTTP estándar, lo que simplifica la infraestructura. No requiere configuración especial de servidores proxy, load balancers o firewalls que sí podría necesitar WebSocket.

3. **API nativa del navegador:** `EventSource` está disponible nativamente en todos los navegadores modernos, sin necesidad de librerías adicionales. Esto reduce el bundle size del frontend.

4. **Reconexión automática:** SSE maneja automáticamente la reconexión si se pierde la conexión, sin necesidad de implementar lógica adicional.

5. **Mejor para el caso de uso:** Para streaming de texto desde un modelo de IA, donde la comunicación es inherentemente unidireccional, SSE es la herramienta correcta y más eficiente.

6. **Menor overhead:** SSE tiene menos overhead de protocolo comparado con WebSocket para comunicación unidireccional.

**Consecuencias:**

**Positivas:**

- ✅ Implementación más rápida y código más simple
- ✅ Mejor compatibilidad con infraestructura HTTP existente
- ✅ Menor superficie de ataque de seguridad (usa HTTP/HTTPS estándar)
- ✅ Debugging más fácil (se puede inspeccionar con herramientas HTTP estándar)
- ✅ Reconexión automática sin código adicional
- ✅ Menor complejidad en testing (mocks más simples)

**Negativas:**

- ⚠️ Si en el futuro necesitamos comunicación bidireccional en tiempo real (ej: typing indicators, presencia de usuarios, colaboración), tendríamos que migrar a WebSocket

---

## Bug Encontrado

### Ubicación

- **Archivo:** `apps/api/src/modules/chat/chat.service.ts`
- **Línea(s):** 78-83
- **Método:** `startNewConversation`

### Descripción del Bug

El método `startNewConversation` modifica por referencia el historial de conversaciones previas almacenado en el cache, causando que se borre el historial de conversaciones anteriores cuando se inicia una nueva conversación.

Cuando un usuario inicia una nueva conversación, el historial de sus conversaciones previas se pierde permanentemente del cache, aunque estos datos aún existan en la base de datos.

### Causa Raíz

El bug ocurre porque el código asigna la referencia del array del cache directamente a la variable `history`, en lugar de crear una copia:

```typescript
if (previousConversations.length > 0) {
  const prevId = previousConversations[0]._id.toString();
  const cachedHistory = this.conversationCache.get(prevId);
  history = cachedHistory || []; //  Asigna la referencia, no una copia
  history.length = 0; //  Esto modifica el array original en el cache
}
```

Cuando se ejecuta `history.length = 0`, no solo se limpia la variable local `history`, sino que también se está modificando directamente el array que está almacenado en `conversationCache`, porque ambas variables apuntan al mismo objeto en memoria.

### Solución Propuesta

```typescript
if (previousConversations.length > 0) {
  const prevId = previousConversations[0]._id.toString();
  const cachedHistory = this.conversationCache.get(prevId);
  history = cachedHistory ? [...cachedHistory] : [];
  history.length = 0;
} else {
  history = [];
}
```

### Cómo lo descubriste

El bug fue descubierto durante la implementación de tests unitarios para el método `startNewConversation`.

**Proceso:**

1. Al escribir el test `should not affect history of previous conversations`, se creó un escenario donde:
   - Se simula una conversación previa con 4 mensajes en el cache
   - Se agrega manualmente este historial al `conversationCache`
   - Se llama a `startNewConversation()` para crear una nueva conversación
   - Se verifica que el historial de la conversación anterior permanece intacto

2. El test falló con el siguiente error:

```
   Expected: Array with 4 messages
   Received: Array with 0 messages (empty array)
```

3. Se confirmó el bug ejecutando el test antes y después del fix:
   - **Antes del fix:** El test falla porque el historial previo se borra
   - **Después del fix:** El test pasa porque cada conversación mantiene su propio historial

---

## Suposiciones Realizadas

1. **Frontend utiliza Vitest en lugar de Jest:** El proyecto frontend está configurado con Vite como build tool, y Vitest es el test runner nativo y recomendado para proyectos Vite. Aunque el proyecto backend usa Jest (estándar en NestJS), mantener Vitest en el frontend es la mejor práctica porque: (a) está optimizado para trabajar con Vite y usa la misma configuración de transformación, (b) es más rápido debido a su integración nativa con Vite, y (c) el `tsconfig.spec.json` ya incluye los tipos de Vitest. Convertir los tests de sintaxis Jest a Vitest solo requirió cambiar `jest` por `vi` y agregar `import { vi } from 'vitest'`.

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
