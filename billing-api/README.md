# Billing Challenge API - Sistema de Facturación por Lote

API backend para el sistema de facturación por lote de una empresa de logística. Este sistema permite gestionar el ciclo de vida completo de servicios facturables, desde su creación hasta la sincronización con sistemas contables externos (ERP).

## 📋 Características Implementadas

### 1. Gestión de Servicios de Logística
- CRUD completo de servicios
- Filtrado por cliente, estado, fecha
- Paginación
- Envío a facturación (crea pendientes de facturación)

### 2. Pendientes de Facturación
- Consulta de pendientes disponibles
- Resumen por cliente y totales
- Cancelación de pendientes (revierte estado del servicio)
- Validación de estado para evitar duplicados

### 3. Facturación por Lote (Proceso Asíncrono)
- **Procesamiento asíncrono con colas (BullMQ + Redis)**
- Creación de lotes con fecha de emisión y talonario
- Generación de numeración correlativa por talonario
- Generación de CAE simulado
- Transacciones atómicas
- **Estados del lote**: `PENDING_PROCESSING`, `IN_PROCESS`, `PROCESSED`, `ERROR`
- **Endpoint para consultar estado del procesamiento**
- **Retry automático con backoff exponencial**
- **Endpoint de retry manual para lotes fallidos**

### 4. Consulta de Facturas
- Filtros múltiples (cliente, fecha, monto, batch)
- Estadísticas y reportes
- Búsqueda por número de factura

### 5. Sincronización con ERP (Simulado)
- Transformación de datos a formato contable
- Generación de asientos contables
- Historial de sincronizaciones
- Preview antes de enviar
- Confirmación de sincronización

### 6. Autenticación y Seguridad
- JWT con mock de AWS Cognito
- Endpoints protegidos
- Guard global de autenticación

### 7. Manejo de Errores
- Filtro global de excepciones
- Mensajes de error descriptivos
- Estructura de respuesta consistente

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- Docker y Docker Compose
- PostgreSQL 14+ (si trabajas sin Docker)
- Redis 7+ (si trabajas sin Docker)

### Con Docker Compose (Recomendado)

```bash
# 1. Configurar variables de entorno
cp env.example .env

# 2. Levantar servicios (PostgreSQL, Redis, API)
docker compose up -d

# 3. Ejecutar migraciones
docker exec billing_challenge_api npm run typeorm:run

# 4. (Opcional) Cargar datos de prueba
docker exec billing_challenge_api npx ts-node src/scripts/seed.ts

# 5. Verificar que funciona
curl http://localhost:3057/health
```

### Sin Docker

```bash
# 1. Configurar base de datos PostgreSQL y Redis
createdb billing_challenge
# Asegúrate de tener Redis corriendo en localhost:6379

# 2. Configurar variables de entorno
cp env.example .env
# Editar .env con tus credenciales locales

# 3. Instalar dependencias
npm install

# 4. Ejecutar migraciones
npm run typeorm:run

# 5. Iniciar aplicación
npm run start:dev
```

---

## 📚 API Endpoints

### Autenticación

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login (mock Cognito) | ❌ |
| GET | `/profile` | Perfil del usuario | ✅ |

### Servicios (`/services`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/services` | Crear servicio | ✅ |
| GET | `/services` | Listar servicios (paginado) | ✅ |
| GET | `/services/:id` | Obtener servicio por ID | ✅ |
| PATCH | `/services/:id` | Actualizar servicio | ✅ |
| DELETE | `/services/:id` | Eliminar servicio | ✅ |
| POST | `/services/send-to-billing` | Enviar a facturación | ✅ |

### Pendientes de Facturación (`/billing-pendings`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/billing-pendings` | Listar pendientes (paginado) | ✅ |
| GET | `/billing-pendings/summary` | Resumen de pendientes | ✅ |
| GET | `/billing-pendings/available` | Pendientes disponibles | ✅ |
| GET | `/billing-pendings/:id` | Obtener pendiente por ID | ✅ |
| DELETE | `/billing-pendings/:id` | Cancelar pendiente | ✅ |

### Lotes de Facturación (`/billing-batches`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/billing-batches` | **Crear lote (async)** | ✅ |
| POST | `/billing-batches/sync` | Crear lote (sync - legacy) | ✅ |
| GET | `/billing-batches` | Listar lotes (paginado) | ✅ |
| GET | `/billing-batches/queue/stats` | **Estadísticas de la cola** | ✅ |
| GET | `/billing-batches/receipt-books` | Listar talonarios usados | ✅ |
| GET | `/billing-batches/next-invoice-number/:book` | Próximo número | ✅ |
| GET | `/billing-batches/:id` | Obtener lote por ID | ✅ |
| GET | `/billing-batches/:id/status` | **Estado del procesamiento** | ✅ |
| POST | `/billing-batches/:id/retry` | **Reintentar lote fallido** | ✅ |

### Facturas (`/invoices`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/invoices` | Listar facturas (paginado) | ✅ |
| GET | `/invoices/statistics` | Estadísticas | ✅ |
| GET | `/invoices/by-customer/:id` | Facturas por cliente | ✅ |
| GET | `/invoices/by-batch/:id` | Facturas por lote | ✅ |
| GET | `/invoices/number/:number` | Buscar por número | ✅ |
| GET | `/invoices/:id` | Obtener factura por ID | ✅ |

### Sincronización ERP (`/erp-sync`)

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | `/erp-sync/invoices` | Sincronizar facturas | ✅ |
| POST | `/erp-sync/batch` | Sincronizar lote completo | ✅ |
| POST | `/erp-sync/preview` | Preview de datos | ✅ |
| GET | `/erp-sync/history` | Historial de syncs | ✅ |
| GET | `/erp-sync/history/:syncId` | Detalle de sync | ✅ |
| POST | `/erp-sync/confirm/:syncId` | Confirmar sync | ✅ |

---

## 🔄 Procesamiento Asíncrono de Lotes

### Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   API Request   │────▶│   Redis Queue   │────▶│   Worker        │
│   POST /batches │     │   (Bull)        │     │   (Processor)   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                        │
         │                       │                        │
         ▼                       ▼                        ▼
    Respuesta               Job queued              Procesa batch
    inmediata                                      Crea facturas
    (batch ID)                                     Actualiza estados
```

### Estados del Lote

| Estado | Descripción |
|--------|-------------|
| `PENDING_PROCESSING` | Lote creado, esperando en cola |
| `IN_PROCESS` | Worker procesando el lote |
| `PROCESSED` | Completado exitosamente |
| `ERROR` | Error durante el procesamiento |

### Flujo de Procesamiento

1. **Crear lote** (POST `/billing-batches`)
   - El lote se crea con estado `PENDING_PROCESSING`
   - Se agrega un job a la cola de Redis
   - Se retorna inmediatamente con el ID del lote

2. **Consultar estado** (GET `/billing-batches/:id/status`)
   - Muestra el estado actual del lote
   - Incluye información del job en la cola (si existe)
   - Muestra progreso del procesamiento

3. **Reintentar** (POST `/billing-batches/:id/retry`)
   - Solo para lotes con estado `ERROR`
   - Re-encola el lote para procesamiento

### Ejemplo de Uso

```bash
# 1. Crear lote (async)
curl -X POST http://localhost:3057/billing-batches \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "issueDate": "2024-01-31",
    "receiptBook": "A-0001",
    "pendingIds": [1, 2, 3]
  }'

# Respuesta:
{
  "batch": {
    "id": 1,
    "status": "PENDING_PROCESSING",
    ...
  },
  "queueInfo": {
    "jobId": "batch-1",
    "status": "queued",
    "message": "Batch 1 has been queued for processing..."
  }
}

# 2. Consultar estado
curl http://localhost:3057/billing-batches/1/status \
  -H "Authorization: Bearer <token>"

# Respuesta (durante procesamiento):
{
  "batch": {
    "id": 1,
    "status": "IN_PROCESS",
    ...
  },
  "jobInfo": {
    "jobId": "batch-1",
    "status": "active",
    "progress": 66,
    "attemptsMade": 0
  }
}

# 3. Ver estadísticas de la cola
curl http://localhost:3057/billing-batches/queue/stats \
  -H "Authorization: Bearer <token>"

# Respuesta:
{
  "waiting": 5,
  "active": 2,
  "completed": 100,
  "failed": 3,
  "delayed": 0
}

# 4. Reintentar lote fallido
curl -X POST http://localhost:3057/billing-batches/1/retry \
  -H "Authorization: Bearer <token>"
```

---

## 📖 Flujo de Facturación Completo

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    SERVICIO     │────▶│    PENDIENTE     │────▶│    FACTURA      │
│    (CREATED)    │     │    (PENDING)     │     │   (en lote)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │ POST                  │ POST                   │ POST
        │ /services/            │ /billing-batches       │ /erp-sync/
        │ send-to-billing       │ (async)                │ invoices
        ▼                       ▼                        ▼
   Servicio pasa           Lote encolado            Datos enviados
   a SENT_TO_BILL          → Procesado              al ERP (simulado)
                           → Facturas creadas
```

---

## 🔐 Autenticación

### Obtener Token

```bash
curl -X POST http://localhost:3057/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
```

Respuesta:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Usar Token

```bash
curl http://localhost:3057/services \
  -H "Authorization: Bearer <token>"
```

---

## 🗂️ Estructura del Proyecto

```
src/
├── auth/                    # Módulo de autenticación
│   ├── decorators/          # Decoradores (@Public, @Roles, etc.)
│   ├── guards/              # Guards de autenticación
│   ├── services/            # Servicio mock de Cognito
│   └── strategies/          # Estrategia JWT
├── billing-batch/           # Módulo de lotes de facturación
│   └── dto/                 # DTOs de validación
├── billing-pending/         # Módulo de pendientes
│   └── dto/
├── common/                  # Código compartido
│   ├── exceptions/          # Excepciones de negocio
│   └── filters/             # Filtros de excepciones
├── config/                  # Configuración
├── entities/                # Entidades TypeORM
├── erp-sync/                # Módulo de sincronización ERP
│   └── dto/
├── invoices/                # Módulo de facturas
│   └── dto/
├── migrations/              # Migraciones de DB
├── queue/                   # ⭐ Módulo de colas (BullMQ)
│   ├── queue.module.ts      # Configuración de Bull
│   └── billing-batch.processor.ts  # Worker de procesamiento
├── scripts/                 # Scripts de utilidad
│   └── seed.ts              # Datos de prueba
└── services/                # Módulo de servicios
    └── dto/
```

---

## 📊 Documentación Swagger

Una vez iniciada la aplicación, accede a la documentación interactiva en:

- **Local**: http://localhost:3000/api
- **Docker**: http://localhost:3057/api

---

## 🧪 Comandos Útiles

```bash
# Desarrollo
npm run start:dev

# Ejecutar migraciones
npm run typeorm:run

# Cargar datos de prueba
npx ts-node src/scripts/seed.ts

# Tests
npm test

# Lint
npm run lint

# Ver logs de Redis (Docker)
docker logs billing_challenge_redis

# Conectar a Redis CLI
docker exec -it billing_challenge_redis redis-cli
```

---

## ⚙️ Configuración de Entorno

```bash
# Database
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=billing_challenge

# Redis (Queue)
REDIS_HOST=redis
REDIS_PORT=6379

# Application
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

---

## ⚠️ Consideraciones

1. **CAE Simulado**: En producción, el CAE se obtiene de AFIP. En este challenge se genera un código simulado.

2. **ERP Simulado**: La sincronización con ERP es una simulación que transforma los datos al formato esperado y tiene un 90% de tasa de éxito simulada.

3. **Numeración Correlativa**: Los números de factura son correlativos dentro de cada talonario (receipt book).

4. **Transacciones**: La creación de lotes usa transacciones para garantizar la atomicidad.

5. **Estados de Servicio**: 
   - `CREATED` → Puede ser editado/eliminado
   - `SENT_TO_BILL` → No puede ser modificado
   - `INVOICED` → No puede ser modificado

6. **Procesamiento Asíncrono**:
   - Los lotes se procesan en background
   - Retry automático con backoff exponencial (3 intentos)
   - Consulta de estado en tiempo real
   - Redis como broker de mensajes

---

# Cuestionario obligatiorio

## 1. Decisiones de Modelado

### 1.1 Relación entre Entidades

El sistema implementa un modelo de dominio con **4 entidades principales** siguiendo el flujo de facturación:

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│   Service    │────▶│  BillingPending │────▶│   Invoice    │────▶│ BillingBatch │
│  (Logística) │ 1:N │   (Transición)  │ 1:1 │(Facturación) │ N:1 │   (Lote)     │
└──────────────┘     └─────────────────┘     └──────────────┘     └──────────────┘
```

**Relaciones específicas:**

| Entidad Origen | Entidad Destino | Tipo | Descripción |
|----------------|-----------------|------|-------------|
| `Service` | `BillingPending` | 1:N | Un servicio puede tener múltiples intentos de facturación (en caso de cancelaciones) |
| `BillingPending` | `Invoice` | 1:1 | Un pendiente genera una única factura |
| `Invoice` | `BillingBatch` | N:1 | Múltiples facturas pertenecen a un mismo lote |
| `BillingPending` | `Service` | N:1 | Múltiples pendientes pueden referenciar al mismo servicio (histórico) |

### 1.2 Campos Obligatorios y Justificación

#### Service (Servicio de Logística)
| Campo | Obligatorio | Tipo | Justificación |
|-------|-------------|------|---------------|
| `id` | ✅ | SERIAL | Identificador único autogenerado |
| `serviceDate` | ✅ | DATE | Requerido para la facturación fiscal (fecha de prestación) |
| `customerId` | ✅ | INTEGER | Identificador del cliente para agrupar y facturar |
| `amount` | ✅ | DECIMAL(10,2) | Monto a facturar - crítico para el proceso |
| `status` | ✅ | ENUM | Control del ciclo de vida del servicio |

#### BillingPending (Pendiente de Facturación)
| Campo | Obligatorio | Tipo | Justificación |
|-------|-------------|------|---------------|
| `id` | ✅ | SERIAL | Identificador único |
| `serviceId` | ✅ | INTEGER (FK) | Referencia al servicio origen |
| `status` | ✅ | ENUM | Control de estado (PENDING/INVOICED) |

#### Invoice (Factura)
| Campo | Obligatorio | Tipo | Justificación |
|-------|-------------|------|---------------|
| `id` | ✅ | SERIAL | Identificador interno |
| `invoiceNumber` | ✅ | VARCHAR | Número correlativo fiscal obligatorio (formato: `{talonario}-{secuencia}`) |
| `cae` | ✅ | VARCHAR | Código de Autorización Electrónica (requerimiento AFIP Argentina) |
| `issueDate` | ✅ | DATE | Fecha de emisión fiscal |
| `amount` | ✅ | DECIMAL(10,2) | Monto facturado |
| `batchId` | ✅ | INTEGER (FK) | Referencia al lote de facturación |
| `pendingId` | ✅ | INTEGER (FK) | Trazabilidad con el pendiente origen |

#### BillingBatch (Lote de Facturación)
| Campo | Obligatorio | Tipo | Justificación |
|-------|-------------|------|---------------|
| `id` | ✅ | SERIAL | Identificador único |
| `issueDate` | ✅ | DATE | Fecha de emisión del lote |
| `receiptBook` | ✅ | VARCHAR | Talonario para numeración correlativa |
| `status` | ✅ | ENUM | Estado del procesamiento |
| `pendingIds` | ❌ | ARRAY | Lista de pendientes a procesar (para reintentos) |
| `errorMessage` | ❌ | TEXT | Detalle de errores (solo si status=ERROR) |

### 1.3 ¿Service debería tener estados de facturación?

**Situación actual:** Se decidió mantener el estado de facturación (CREATED, SENT_TO_BILL, INVOICED) directamente dentro de la tabla Service.

**Motivo:** Facilita las consultas y el desarrollo rápido (ideal para un challenge), evitando la complejidad de unir varias tablas cada vez que quieras saber en qué estado está un servicio.

**Alternativa:** En una aplicación real a gran escala, lo ideal sería eliminar ese campo de la tabla y calcularlo "al vuelo" mediante una Vista Materializada en la base de datos o una Propiedad Calculada en el código (ORM), evitando así que los datos se desincronicen.

| Aspecto | A favor | En contra |
|---------|---------|-----------|
| **Simplicidad de consulta** | ✅ Consultas rápidas sin joins | ❌ Denormalización de datos |
| **Rendimiento** | ✅ No necesita calcular estado | ❌ Sincronización de estados |
| **Cohesión** | ❌ Mezcla dominios | ✅ Estado en entidad correcta |
| **Escalabilidad** | ❌ Acoplamiento | ✅ Mejor separación |


### 1.4 Separación del Dominio de Logística vs Facturación

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOMINIO DE LOGÍSTICA                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Service (entidad principal)                                               │
│  • ServicesModule, ServicesService, ServicesController                       │
│  • Responsabilidades:                                                        │
│    - CRUD de servicios de logística                                          │
│    - Filtrado y búsqueda                                                     │
│    - Envío a facturación (punto de transición)                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ sendToBilling()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOMINIO DE FACTURACIÓN                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  • BillingPending (cola de pendientes)                                       │
│  • BillingBatch (lotes de facturación)                                       │
│  • Invoice (facturas emitidas)                                               │
│  • BillingPendingModule, BillingBatchModule, InvoicesModule                  │
│  • Responsabilidades:                                                        │
│    - Gestión de pendientes                                                   │
│    - Procesamiento de lotes (síncrono/asíncrono)                            │
│    - Generación de numeración y CAE                                          │
│    - Consulta de facturas                                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ syncToERP()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOMINIO DE CONTABILIDAD/ERP                           │
├─────────────────────────────────────────────────────────────────────────────┤
│  • ErpSyncModule, ErpSyncService                                             │
│  • Responsabilidades:                                                        │
│    - Transformación a formato contable                                       │
│    - Generación de asientos contables                                        │
│    - Sincronización con sistemas externos                                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Puntos de separación implementados:**

1. **Módulos independientes:** Cada dominio tiene su propio módulo NestJS
2. **Entidad de transición:** `BillingPending` actúa como "boundary" entre logística y facturación
3. **Servicios especializados:** Cada servicio tiene responsabilidades claras
4. **DTOs diferentes:** Cada dominio define sus propios DTOs

---

## 2. Concurrencia e Idempotencia

### 2.1 Manejo de Facturación Concurrente

**Escenario:** Dos usuarios intentan facturar el mismo `BillingPending` simultáneamente.

**Estrategias implementadas:**

#### A) Validación de Estado Pre-Procesamiento
```typescript
// billing-batch.processor.ts
for (const pending of pendings) {
  if (pending.status !== PendingStatus.PENDING) {
    failedPendings.push({
      id: pending.id,
      reason: `Pending is not in PENDING status (current: ${pending.status})`,
    });
    continue;
  }
  validPendings.push(pending);
}
```

#### B) Transacciones Atómicas
```typescript
// billing-batch.service.ts
const queryRunner = this.dataSource.createQueryRunner();
await queryRunner.connect();
await queryRunner.startTransaction();

try {
  // Todas las operaciones dentro de la transacción
  // Si falla cualquiera, se hace rollback completo
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
  throw error;
} finally {
  await queryRunner.release();
}
```

#### C) Job ID Único en Cola
```typescript
// billing-batch.service.ts
const job = await this.billingBatchQueue.add(
  data,
  {
    jobId: `batch-${savedBatch.id}`, // ID único por batch
    attempts: 3,
  },
);
```

### 2.2 Garantía de Idempotencia

**Mecanismos implementados:**

| Mecanismo | Implementación | Propósito |
|-----------|----------------|-----------|
| **Job ID único** | `batch-${batchId}` | Evita duplicación de jobs en cola |
| **Validación de estado** | Check de `PendingStatus.PENDING` | Solo procesa pendientes válidos |
| **Check de duplicados** | `existingPending` lookup | Evita crear múltiples pendings para un servicio |

### 2.3 Estrategias Adicionales

```typescript
// 1. Optimistic Locking con versión
@Entity('billing_pendings')
export class BillingPending {
  @VersionColumn()
  version: number;
}

// 2. Pessimistic Locking para operaciones críticas
const pending = await queryRunner.manager.findOne(BillingPending, {
  where: { id: pendingId },
  lock: { mode: 'pessimistic_write' },
});

// 3. Constraint único a nivel de BD
ALTER TABLE billing_pendings 
ADD CONSTRAINT unique_service_pending 
UNIQUE (service_id) WHERE status = 'PENDING';

// 4. Idempotency key en request headers
@Post('billing-batches')
async create(
  @Headers('Idempotency-Key') idempotencyKey: string,
  @Body() dto: CreateBillingBatchDto
) {
  // Verificar si ya se procesó esta key
  const existing = await this.cache.get(`idempotency:${idempotencyKey}`);
  if (existing) return existing;
  
  const result = await this.process(dto);
  await this.cache.set(`idempotency:${idempotencyKey}`, result, 3600);
  return result;
}
```

---

## 4. Alcance del Challenge

### Features Priorizadas

| Feature | Prioridad | Justificación |
|---------|-----------|---------------|
| **CRUD de Services** | Alta | Base del flujo de negocio |
| **Gestión de Pendings** | Alta | Punto crítico de transición entre dominios |
| **Procesamiento Asíncrono** | Alta | Requerimiento diferenciador del challenge |
| **Facturación por Lote** | Alta | Core del sistema |
| **Sync ERP (simulado)** | Media | Demuestra integración pero no era crítico |
| **Autenticación JWT** | Media | Seguridad básica requerida |
| **Documentación Swagger** | Media | Facilita evaluación del challenge |

## 5. Preparación de Datos para Sincronización con Sistema Contable

### 5.1 Formato de Datos Diseñado

Se eligió un **formato JSON estructurado** que mapea directamente a conceptos contables:

```typescript
interface ErpInvoiceDataDto {
  // Datos de factura
  invoiceNumber: string;     // "A-0001-00000001"
  cae: string;               // Código AFIP
  issueDate: string;         // ISO 8601
  amount: number;
  
  // Datos de origen
  customerId: number;
  serviceDate: string;
  receiptBook: string;
  batchId: number;
  
  // Asientos contables
  accountingEntries: AccountingEntry[];
}

interface AccountingEntry {
  accountCode: string;       // "1.1.3.01"
  accountName: string;       // "Cuentas por Cobrar"
  debit: number;
  credit: number;
}
```

### 5.2 Información Incluida y Justificación

| Campo | Justificación |
|-------|---------------|
| `invoiceNumber` | Identificador fiscal único para el ERP |
| `cae` | Código de autorización requerido por AFIP |
| `issueDate` | Fecha de imputación contable |
| `amount` | Monto total para cuadre |
| `customerId` | Vinculación con maestro de clientes |
| `serviceDate` | Fecha de prestación (puede diferir de emisión) |
| `receiptBook` | Talonario para control de numeración |
| `accountingEntries` | Asientos listos para importar |

### 5.3 Estructura de Asientos Contables

```typescript
// Generación automática de asientos (IVA 21%)
accountingEntries: [
  {
    accountCode: '1.1.3.01',
    accountName: 'Cuentas por Cobrar',
    debit: amount,           // Total factura
    credit: 0,
  },
  {
    accountCode: '4.1.1.01',
    accountName: 'Ventas de Servicios',
    debit: 0,
    credit: amount / 1.21,   // Neto (sin IVA)
  },
  {
    accountCode: '2.1.5.01',
    accountName: 'IVA Débito Fiscal',
    debit: 0,
    credit: amount - (amount / 1.21), // IVA
  },
]
```

**Razones del formato elegido:**

1. **Compatibilidad ERP:** Estructura estándar para importación
2. **Completitud:** Incluye tanto datos fiscales como contables
3. **Trazabilidad:** Mantiene referencias cruzadas (batchId, pendingId)
4. **Autonomía:** El ERP puede procesar sin consultas adicionales

---

## 6. Procesamiento Asíncrono

### 6.1 Tecnología de Colas Elegida

**BullMQ con Redis**

| Característica | BullMQ | Alternativas (RabbitMQ/SQS) |
|----------------|--------|----------------------------|
| Setup | ✅ Muy simple | ⚠️ Más complejo |
| Integración NestJS | ✅ @nestjs/bull nativo | ⚠️ Librerías externas |
| Persistencia | ✅ Redis (ya usado) | ✅ Servidor dedicado |
| UI Dashboard | ✅ Bull Board | ✅ Management UI |
| Retry/Backoff | ✅ Built-in | ✅ Configurable |
| Escalabilidad | ⚠️ Limitado por Redis | ✅ Cluster nativo |

**Justificación:** Para el alcance del challenge, BullMQ ofrece el mejor balance entre funcionalidad y simplicidad de implementación.

### 6.2 Manejo de Procesamiento por Lotes

El procesamiento asíncrono de lotes sigue un flujo de 4 fases dentro de un worker de BullMQ:

1. **Transición de estado:** Al iniciar, el lote pasa a IN_PROCESS para indicar que está siendo procesado.
2. **Transacción atómica:** Todo el procesamiento ocurre dentro de una transacción de base de datos, garantizando que o se crean todas las facturas del lote, o ninguna (rollback completo ante errores).
3. **Procesamiento iterativo con progreso:** Cada pendiente se procesa secuencialmente, reportando el porcentaje de avance al job de la cola para permitir monitoreo en tiempo real.
4. **Finalización:** Si todo fue exitoso, se hace commit y el lote pasa a PROCESSED. Si hay error, se hace rollback y el lote queda en ERROR, disponible para retry manual.

```typescript
@Processor(BILLING_BATCH_QUEUE)
export class BillingBatchProcessor {
  @Process()
  async processBillingBatch(job: Job<BillingBatchJobData>) {
    const { batchId, pendingIds, issueDate, receiptBook } = job.data;

    // 1. Actualizar estado a IN_PROCESS
    await this.batchRepository.update(batchId, {
      status: BatchStatus.IN_PROCESS,
      processingStartedAt: new Date(),
    });

    // 2. Iniciar transacción
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // 3. Procesar cada pending con reporte de progreso
      for (const pending of validPendings) {
        const progress = Math.round(
          ((validPendings.indexOf(pending) + 1) / validPendings.length) * 100
        );
        await job.progress(progress);
        
        // Crear factura...
      }

      await queryRunner.commitTransaction();
      
      // 4. Actualizar estado a PROCESSED
      await this.batchRepository.update(batchId, {
        status: BatchStatus.PROCESSED,
        processingCompletedAt: new Date(),
      });
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // Estado se actualiza a ERROR automáticamente
      throw error;
    }
  }
}
```

### 6.3 Manejo de Errores y Reintentos

```typescript
// Configuración del job
const job = await this.billingBatchQueue.add(
  data,
  {
    jobId: `batch-${savedBatch.id}`,
    attempts: 3,                    // Máximo 3 intentos
    backoff: {
      type: 'exponential',          // Espera incremental
      delay: 2000,                  // 2s → 4s → 8s
    },
  },
);
```

**Eventos de ciclo de vida:**

```typescript
@OnQueueActive()
onActive(job: Job) {
  this.logger.log(`Processing job ${job.id}...`);
}

@OnQueueCompleted()
onCompleted(job: Job, result: BillingBatchJobResult) {
  this.logger.log(`Job ${job.id} completed with ${result.totalInvoices} invoices.`);
}

@OnQueueFailed()
onFailed(job: Job, error: Error) {
  this.logger.error(`Job ${job.id} failed: ${error.message}`);
  // El batch queda en estado ERROR para retry manual
}
```

**Endpoint de retry manual:**

```typescript
@Post(':id/retry')
async retryBatch(@Param('id') id: number) {
  const batch = await this.findOne(id);
  
  if (batch.status !== BatchStatus.ERROR) {
    throw new BatchProcessingException(
      `Cannot retry batch in status '${batch.status}'`
    );
  }

  await this.batchRepository.update(id, {
    status: BatchStatus.PENDING_PROCESSING,
    errorMessage: null,
  });

  const job = await this.billingBatchQueue.add(data, {
    jobId: `batch-${id}-retry-${Date.now()}`,
    attempts: 3,
  });

  return { message: `Batch ${id} queued for retry`, jobId: job.id };
}
```

---

## 7. Migraciones y Seeds

### 7.1 Estructura de Migraciones

**Archivo:** `src/migrations/1700000000000-InitialSchema.ts`

```typescript
export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migración implementada con verificaciones de existencia
    // para ser idempotente (se puede ejecutar múltiples veces)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback completo en orden inverso
  }
}
```

### 7.2 Cambios Realizados por la Migración

| Orden | Elemento | Descripción | Impacto en Datos |
|-------|----------|-------------|------------------|
| 1 | ENUM `service_status_enum` | Estados: CREATED, SENT_TO_BILL, INVOICED | Ninguno |
| 2 | Tabla `services` | Servicios de logística | Ninguno |
| 3 | ENUM `pending_status_enum` | Estados: PENDING, INVOICED | Ninguno |
| 4 | Tabla `billing_pendings` | Pendientes de facturación | Ninguno |
| 5 | ENUM `batch_status_enum` | Estados: PROCESSED, ERROR | Ninguno |
| 6 | Tabla `billing_batches` | Lotes de facturación | Ninguno |
| 7 | Tabla `invoices` | Facturas emitidas | Ninguno |
| 8 | FK `billing_pendings.serviceId` | Referencia a services | Ninguno |
| 9 | FK `invoices.batchId` | Referencia a billing_batches | Ninguno |
| 10 | FK `invoices.pendingId` | Referencia a billing_pendings | Ninguno |

**Características de la migración:**

- **Idempotente:** Verifica existencia antes de crear
- **Reversible:** Implementa `down()` completo
- **Ordenada:** Crea dependencias antes de FKs

### 7.3 Ejecución de Migraciones

```bash
# Con Docker
docker exec billing_challenge_api npm run typeorm:run

# Sin Docker
npm run typeorm:run

# Revertir última migración
npm run typeorm:revert
```

### 7.4 Seeds - Datos de Prueba

**Archivo:** `src/scripts/seed.ts`

**Datos incluidos:**

| Entidad | Cantidad | Descripción |
|---------|----------|-------------|
| Services | 15+ | Servicios para 5 clientes diferentes |
| BillingPendings | - | Se crean al usar `sendToBilling` |
| BillingBatches | - | Se crean al procesar pendientes |
| Invoices | - | Se generan automáticamente |

**Distribución de datos de prueba:**

```typescript
const services = [
  // Customer 1 - 4 servicios
  { serviceDate: '2024-01-05', customerId: 1, amount: 1500.00 },
  { serviceDate: '2024-01-10', customerId: 1, amount: 2300.50 },
  { serviceDate: '2024-01-15', customerId: 1, amount: 850.00 },
  { serviceDate: '2024-01-20', customerId: 1, amount: 3200.75 },
  
  // Customer 2 - 3 servicios
  { serviceDate: '2024-01-08', customerId: 2, amount: 4500.00 },
  { serviceDate: '2024-01-12', customerId: 2, amount: 1200.00 },
  { serviceDate: '2024-01-18', customerId: 2, amount: 2800.25 },
  
  // Customer 3 - 2 servicios
  { serviceDate: '2024-01-06', customerId: 3, amount: 950.00 },
  { serviceDate: '2024-01-14', customerId: 3, amount: 1750.50 },
  
  // Customer 4 - 1 servicio
  { serviceDate: '2024-01-22', customerId: 4, amount: 5000.00 },
  
  // Customer 5 - 3 servicios
  { serviceDate: '2024-01-03', customerId: 5, amount: 600.00 },
  { serviceDate: '2024-01-09', customerId: 5, amount: 1100.00 },
  { serviceDate: '2024-01-16', customerId: 5, amount: 2200.00 },
  // ... más servicios
];
```

**Ejecución de seeds:**

```bash
# Con Docker
docker exec billing_challenge_api npx ts-node src/scripts/seed.ts

# Sin Docker
npx ts-node src/scripts/seed.ts
```

### 7.5 Flujo de Prueba Completo

```bash
# 1. Levantar servicios
docker compose up -d

# 2. Ejecutar migraciones
docker exec billing_challenge_api npm run typeorm:run

# 3. Cargar datos de prueba
docker exec billing_challenge_api npx ts-node src/scripts/seed.ts

# 4. Obtener token de autenticación
curl -X POST http://localhost:3057/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'

# 5. Probar flujo completo:
# 5.1 Ver servicios disponibles
curl http://localhost:3057/services -H "Authorization: Bearer {token}"

# 5.2 Enviar a facturación
curl -X POST http://localhost:3057/services/send-to-billing \
  -H "Authorization: Bearer {token}" \
  -d '{"serviceIds": [1, 2, 3]}'

# 5.3 Crear lote de facturación
curl -X POST http://localhost:3057/billing-batches \
  -H "Authorization: Bearer {token}" \
  -d '{"issueDate":"2024-01-31","receiptBook":"A-0001","pendingIds":[1,2,3]}'

# 5.4 Ver estado del lote
curl http://localhost:3057/billing-batches/1/status \
  -H "Authorization: Bearer {token}"
```

---

## 8. Mejoras Futuras

### 8.1 Mejoras Técnicas

| Mejora | Prioridad | Complejidad | Beneficio |
|--------|-----------|-------------|-----------|
| Tests unitarios y e2e | Alta | Media | Confiabilidad |
| Optimistic Locking | Alta | Baja | Concurrencia |
| Paginación cursor-based | Media | Media | Performance con grandes volúmenes |
| Rate limiting | Media | Baja | Seguridad |
| Caching con Redis | Media | Baja | Performance |
| OpenTelemetry tracing | Baja | Media | Observabilidad |
| Health checks detallados | Baja | Baja | Monitoreo |

### 8.2 Mejoras de Negocio

| Mejora | Descripción |
|--------|-------------|
| Entidad Customer | Clientes completo |
| Múltiples tipos de factura | Facturas A, B, C según AFIP |
| Notas de crédito | Anulación/modificación de facturas |
| Integración real AFIP | Obtención de CAE real |
| Reportes y dashboards | Analytics de facturación |
| Notificaciones | Email/webhook al completar lotes |

### 8.3 Problemas Anticipados

| Problema | Contexto | Solución Propuesta |
|----------|----------|---------------------|
| **Race conditions** | Múltiples workers procesando | Pessimistic locking + constraints únicos |
| **Timeout en lotes grandes** | Miles de facturas | Chunk processing + progress tracking |
| **Fallo de Redis** | Pérdida de jobs | Persistencia AOF + réplicas |
| **Inconsistencia ERP** | Sync parcial | Saga pattern + compensating transactions |
| **Memoria en procesamiento** | Lotes muy grandes | Stream processing |
| **Numeración duplicada** | Concurrencia alta | Sequence en BD + retry |

### 8.4 Arquitectura Propuesta para Producción

```
                                    ┌─────────────────┐
                                    │   API Gateway   │
                                    │  (Rate Limit)   │
                                    └────────┬────────┘
                                             │
                    ┌────────────────────────┼────────────────────────┐
                    │                        │                        │
            ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
            │   Service A   │       │   Service B   │       │   Service C   │
            │  (Logística)  │       │(Facturación)  │       │    (ERP)      │
            └───────┬───────┘       └───────┬───────┘       └───────┬───────┘
                    │                       │                       │
            ┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
            │  PostgreSQL   │       │     Redis     │       │   Message     │
            │   (Primary)   │       │   (Cluster)   │       │    Broker     │
            └───────────────┘       └───────────────┘       └───────────────┘
```

