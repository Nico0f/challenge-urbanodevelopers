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

### 3. Facturación por Lote (Proceso Manual)
- Creación de lotes con fecha de emisión y talonario
- Generación de numeración correlativa por talonario
- Generación de CAE simulado
- Transacciones atómicas
- Manejo de errores robusto

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

### Con Docker Compose (Recomendado)

```bash
# 1. Configurar variables de entorno
cp .env.example .env

# 2. Levantar servicios
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
# 1. Configurar base de datos PostgreSQL local
createdb billing_challenge

# 2. Configurar variables de entorno
cp .env.example .env
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
| POST | `/billing-batches` | **Crear lote (facturar)** | ✅ |
| GET | `/billing-batches` | Listar lotes (paginado) | ✅ |
| GET | `/billing-batches/receipt-books` | Listar talonarios usados | ✅ |
| GET | `/billing-batches/next-invoice-number/:book` | Próximo número | ✅ |
| GET | `/billing-batches/:id` | Obtener lote por ID | ✅ |

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

## 📖 Flujo de Facturación

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    SERVICIO     │────▶│    PENDIENTE     │────▶│    FACTURA      │
│    (CREATED)    │     │    (PENDING)     │     │   (en lote)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                       │                        │
        │ POST                  │ POST                   │ POST
        │ /services/            │ /billing-batches       │ /erp-sync/
        │ send-to-billing       │ (crear lote)           │ invoices
        ▼                       ▼                        ▼
   Servicio pasa          Pendiente pasa            Datos enviados
   a SENT_TO_BILL         a INVOICED                al ERP (simulado)
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

## 📝 Ejemplos de Uso

### 1. Crear un servicio

```bash
curl -X POST http://localhost:3057/services \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceDate": "2024-01-15",
    "customerId": 1,
    "amount": 1500.50
  }'
```

### 2. Enviar servicios a facturación

```bash
curl -X POST http://localhost:3057/services/send-to-billing \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceIds": [1, 2, 3]
  }'
```

### 3. Crear lote de facturación

```bash
curl -X POST http://localhost:3057/billing-batches \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "issueDate": "2024-01-31",
    "receiptBook": "A-0001",
    "pendingIds": [1, 2, 3]
  }'
```

### 4. Sincronizar con ERP

```bash
curl -X POST http://localhost:3057/erp-sync/batch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "batchId": 1
  }'
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

---

## 📄 Licencia

MIT
