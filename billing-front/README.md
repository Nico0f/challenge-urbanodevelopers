# Billing Frontend - Sistema de Facturación por Lote

Frontend React + TypeScript para el sistema de facturación por lote de una empresa de logística.

## 🚀 Tecnologías

- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Lucide React** - Iconos

## 📦 Estructura del Proyecto

```
billing-front/
├── src/
│   ├── components/           # Componentes React
│   │   ├── BatchCreationScreen.tsx
│   │   ├── BatchResultScreen.tsx
│   │   ├── Filters.tsx
│   │   ├── LoginForm.tsx
│   │   ├── PendingListScreen.tsx
│   │   ├── StatusBadge.tsx
│   │   └── index.ts
│   ├── services/             # Servicios de API
│   │   └── api.ts
│   ├── types/                # Tipos TypeScript
│   │   └── index.ts
│   ├── App.tsx               # Componente principal
│   ├── main.tsx              # Punto de entrada
│   ├── index.css             # Estilos globales
│   └── vite-env.d.ts         # Tipos de Vite
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── .env.example
└── .gitignore
```

## 🛠️ Instalación

```bash
# Clonar o copiar el proyecto
cd billing-front

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con la URL de tu API

# Iniciar en modo desarrollo
npm run dev
```

## ⚙️ Configuración

Crea un archivo `.env` basado en `.env.example`:

```env
VITE_API_URL=http://localhost:3057
```

## 📱 Pantallas

### 1. Login
- Autenticación con JWT
- Credenciales por defecto: `admin / admin`

### 2. Listado de Pendientes
- Tabla con pendientes disponibles para facturar
- Filtros por cliente y rango de fechas
- Selección múltiple con checkboxes
- Resumen de totales y estadísticas
- Paginación

### 3. Creación de Lote
- Selección de fecha de emisión
- Selección/creación de talonario
- Vista previa de pendientes seleccionados
- Indicador de próximo número de factura

### 4. Resultado del Lote
- Información del lote procesado
- Listado de facturas generadas
- Manejo de errores parciales

## 📋 Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build para producción
npm run preview  # Preview del build
npm run lint     # Linter
```

## 🔗 API Endpoints Utilizados

- `POST /auth/login` - Autenticación
- `GET /billing-pendings` - Listar pendientes
- `GET /billing-pendings/summary` - Resumen de pendientes
- `GET /billing-pendings/:id` - Detalle de pendiente
- `POST /billing-batches` - Crear lote
- `GET /billing-batches/receipt-books` - Talonarios disponibles
- `GET /billing-batches/next-invoice-number/:book` - Próximo número
