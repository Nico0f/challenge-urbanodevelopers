# Challenge Técnico Fullstack - Nivel Senior
## Sistema de Facturación por Lote

> **⚠️ Perfil Esperado**: Este challenge está orientado a perfiles **Senior con fuerte experiencia en Backend**. Aunque incluye un componente frontend (React), el foco de evaluación está en el diseño de dominio, arquitectura backend, manejo de errores, y decisiones técnicas del lado del servidor. Se espera que el candidato/a demuestre profundidad técnica en backend más que en frontend.

---

## 📋 Contexto del Negocio

Somos una empresa de logística que factura servicios a mes vencido. A diferencia de sistemas de facturación automática, nuestro proceso es **manual y controlado**, inspirado en sistemas ERP tradicionales como Tango.

### Objetivo del Challenge

El objetivo de este challenge es crear un sistema para **generar facturas por lote** y **preparar los datos** para que puedan ser enviados a un sistema contable externo (ERP) para su registro contable. El sistema debe:

1. Gestionar el ciclo de vida de servicios facturables
2. Permitir la facturación manual por lotes
3. **Preparar y transformar los datos** de facturas en un formato que un sistema contable pueda procesar
4. **Simular el proceso de envío** al sistema contable externo

> **Nota**: No se requiere conectarse a un sistema contable real. El objetivo es preparar los datos en un formato que contenga la información necesaria y simular el proceso de envío.

### 📊 Flujo de Facturación

El flujo de facturación consta de tres etapas principales:

1. **Generación de pendientes**: Los servicios facturables se marcan como "enviados a facturar", creando pendientes de facturación.
2. **Facturación por lote**: Un usuario ejecuta manualmente un proceso que agrupa pendientes seleccionados, define fecha de emisión y talonario, y genera facturas con numeración correlativa.
3. **Preparación para sincronización**: Las facturas generadas se transforman a un formato estándar y se preparan para enviar al sistema contable externo (simulado).

---

## Stack Tecnológico Requerido

### Backend
- **Framework**: NestJS
- **Lenguaje**: TypeScript
- **Autenticación**: AWS Cognito (real o mock para desarrollo)

### Frontend(Optional - Client Side Rendering)
- **Framework**: React (puede usar cualquier herramienta de build)
- **Lenguaje**: TypeScript
- **Estado**: A elección del candidato (Redux, Zustand, Context API, etc.)

### Infraestructura
- **Containerización**: Docker / Docker Compose
- **Base de datos**: Libre (PostgreSQL sugerida)
- **Opcional**: 
  - Sistema de colas (SQS, RabbitMQ, Redis Queue, BullMQ, etc.) para procesamiento asíncrono

### Autenticación
- Integración con AWS Cognito para login
- Uso de Bearer Token (JWT)
- Endpoints protegidos según requerimientos

---

## Dominio Funcional

### 1. Servicios / Envíos Facturables

**Definición**: Representan servicios de logística que pueden ser facturados.

**Características**:
- Se crean con:
  - Fecha de servicio (`serviceDate` - fecha única cuando se realizó el servicio)
  - Cliente (identificador)
  - Importe (monto facturable)
- **NO tienen**:
  - Fecha de emisión
  - Número de factura
  - Estado de facturación inicial

**Estados** (si se implementan):
- Los estados de Service deberían ser del dominio de logística (ej: `PENDING`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`)
- **NO deberían incluir estados de facturación** (`SENT_TO_BILL`, `INVOICED`) porque contamina el dominio
- La información de facturación debe estar en `BillingPending` o en una relación separada

---

### 2. Pendientes de Facturación

**Definición**: Representan ítems listos para ser incluidos en un lote de facturación.

**Características**:
- Se generan automáticamente al marcar un servicio como "enviado a facturar"
- Representan servicios que están listos para ser facturados
- **NO se emiten facturas** en esta instancia
- Pueden ser seleccionados para formar parte de un lote

**Estados sugeridos**:
- `PENDIENTE`: Pendiente disponible para incluir en un lote
- `FACTURADO`: Pendiente ya incluido en una factura

**Restricciones**:
- Un pendiente solo puede ser facturado una vez

---

### 3. Facturación por Lote

**Definición**: Proceso explícito y manual que agrupa pendientes y genera facturas.

**Características**:
- Proceso **explícito y manual** (no automático)
- Permite seleccionar múltiples pendientes
- Define parámetros del lote:
  - **Fecha del lote** (fecha de emisión de todas las facturas)
  - **Talonario** (identificador del talonario a utilizar)
- Genera facturas con:
  - Numeración correlativa (secuencial dentro del talonario)
  - CAE simulado (Código de Autorización Electrónico)
    - **Nota**: En producción, el CAE se obtiene de AFIP. En el challenge debe simularse.
- Todas las facturas del lote comparten la misma fecha de emisión

**Estados sugeridos**:
- `PROCESADO`: Lote procesado exitosamente
- `ERROR`: Lote con errores en el procesamiento

**Restricciones críticas**:
- **No debe haber facturación automática**
- La fecha de emisión solo se define de manera forzada al ejecutar el lote

---

## 🔒 Autenticación y Autorización

### Requisitos de Autenticación

- Login mediante AWS Cognito (o mock para desarrollo)
- Uso de Bearer Token (JWT) en headers
- Endpoints protegidos:
  - Emitir lotes de facturación
  - Consultar pendientes de facturación
  - Consultar facturas generadas

### Endpoints Públicos
- Health check
- Login

---

## ⚠️ Manejo de Errores

El manejo de errores es **clave para la evaluación**.

### Mensajes de Error
- Mensajes claros y descriptivos
- Estructura consistente en toda la API
- Incluir códigos de error cuando sea apropiado

---

## 🖥️ Frontend(opcional)

### Pantallas Sugeridas

#### 1. Listado de Pendientes de Facturación
- Tabla con pendientes disponibles
- Filtros:
  - Por cliente
  - Por fecha de servicio (rango de fechas)
- Acción para seleccionar pendientes
- Indicadores de estado

#### 2. Facturación por Lote
- Formulario para crear lote:
  - Selección de pendientes (checkboxes o similar)
  - Campo de fecha de emisión
  - Campo de talonario
- Botón de ejecución explícito
- Feedback visual del proceso

#### 3. Resultado del Lote
- Visualización del resultado del procesamiento
- Listado de facturas generadas
- Información del lote (fecha, talonario, cantidad de facturas)
- Manejo de errores parciales (si se implementa)


---

## 📚 Documentación Obligatoria

El candidato debe incluir en el README una sección explicando:

### 1. Decisiones de Modelado
- ¿Cómo se relacionan las entidades?
- ¿Qué campos son obligatorios y por qué?
- ¿Service debería tener estados de facturación o esa responsabilidad pertenece a otro dominio?
- ¿Cómo se separa el dominio de logística del dominio de facturación?

### 2. Concurrencia e Idempotencia
- ¿Cómo se manejaría si dos usuarios intentan facturar el mismo pendiente?
- ¿Cómo se garantiza la idempotencia del proceso de facturación?
- ¿Qué estrategias se implementarían?

### 4. Alcance del challenge
- ¿Por qué se priorizaron ciertas features?

### 5. Preparación de Datos para Sincronización con Sistema Contable
- ¿Qué formato de datos se diseñó y por qué?
- ¿Qué información se incluyó en el formato de sincronización?
- ¿Por qué se eligieron esos campos específicos?

### 6. Procesamiento Asíncrono (Si se implementó)
- ¿Qué tecnología de colas elegiste y por qué?
- ¿Cómo manejas el procesamiento asíncrono de lotes?
- ¿Cómo se manejan los errores y reintentos?

### 7. Migraciones y Seeds
- **Migraciones**: Explicar cómo se estructuran las migraciones y qué cambios realizan
- **Documentación de migraciones**: Cada migración debe tener comentarios claros explicando:
  - Qué cambios realiza
  - Por qué se realizan esos cambios
  - Impacto en los datos existentes (si aplica)
- **Seeds**: Explicar qué datos de ejemplo se incluyen y cómo ejecutarlos

Implementar las migraciones de base de datos como un **servicio separado** en Docker Compose que se ejecute automáticamente antes del servicio principal.

- **Datos de prueba**: Los seeds deben incluir datos suficientes para probar todos los flujos del sistema

### 8. Mejoras Futuras
- ¿Qué mejoras se considerarían a futuro?
- ¿Qué problemas técnicos o de negocio se anticipan?

---

## ⭐ Opcional (Plus Senior)

Estas funcionalidades no son obligatorias

### Procesamiento Asíncrono y Colas

Implementar el procesamiento de lotes de facturación de forma **asíncrona** usando colas de mensajes.

**Objetivo**: Evaluar conocimiento en:
- Procesamiento asíncrono
- Sistemas de colas (SQS, RabbitMQ, Redis, etc.)
- Workers/Jobs en background
- Manejo de tareas de larga duración

**Implementación sugerida**:
- Al crear un lote, en lugar de procesarlo inmediatamente, enviarlo a una cola
- Implementar un worker que procese los lotes de forma asíncrona
- Manejar estados del lote: `PENDIENTE_PROCESAMIENTO`, `EN_PROCESO`, `PROCESADO`, `ERROR`
- Permitir consultar el estado del procesamiento

**Tecnologías sugerida**
- **AWS SQS**(localstack) o cualquier otra tecnología de colas

**Priorizamos calidad y criterio en backend por sobre volumen de código. El frontend debe ser funcional pero no es el foco principal de evaluación.**

---

## Dudas frecuentes

### ¿Puedo usar librerías adicionales?
Sí, siempre que estén justificadas

### ¿Debo implementar todas las funcionalidades opcionales?
No, son opcionales. Implementa las que consideres relevantes para demostrar tu nivel.

### ¿Cómo debo manejar la autenticación con Cognito?
Puedes usar Cognito real o crear un mock. Lo importante es que el flujo de autenticación funcione correctamente.

### ¿Qué nivel de testing se espera?
No es obligatorio, pero tests unitarios o de integración son bienvenidos.

### ¿Puedo usar TypeORM, Prisma u otro ORM?
Sí, la elección de herramientas es libre siempre que uses NestJS y TypeScript.

---

## 🚀 Inicio Rápido

Para comenzar con el challenge, consulta las **instrucciones detalladas de instalación y ejecución** en el README del repositorio de la API:

📖 **Ver**: `billing-api/README.md`

El repositorio `billing-api` incluye:
- Configuración completa de NestJS, TypeORM y PostgreSQL
- Docker Compose listo para usar
- Instrucciones para desarrollo con Docker o local
- Modelo de datos sugerido con migración inicial
- Autenticación básica configurada

**Importante**: 
- Debes crear y documentar todas las migraciones necesarias para el esquema de base de datos
- Debes incluir seeds para poblar la base de datos con datos de ejemplo que permitan probar el sistema

> **Nota**: Puedes agregar más repositorios al lado de `billing-api` según necesites (por ejemplo: `billing-frontend`, `billing-worker`, etc.).

---

**¡Éxito en el challenge!**

