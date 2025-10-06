
Leer todo para entender lo del proyecto de la uni chavos ya saben si no entienden algo aqui puse todo lo que nececitan saber

# PuntoVenta - Sistema de Gestión de Ventas

Sistema completo de punto de venta con frontend en React y backend en .NET Core.

## Configuración Inicial

### 1. Instalar dependencias del frontend:
```bash
cd frontend
npm install
npm install concurrently open --save-dev
```

### 2. Instalar dependencias del backend:
```bash
cd backend
dotnet restore
```

### 3. Configurar la base de datos:
```bash
cd backend
dotnet ef database update
```

## Ejecución

### Ejecutar ambos proyectos (desde la carpeta `frontend`):
```bash
npm run start:all
```

Esto iniciará:
- Backend en http://localhost:5028
- Frontend en http://localhost:3000
- Swagger UI en http://localhost:5028/swagger/index.html

## Migraciones de Base de Datos

### Aplicar migraciones existentes:
```bash
cd backend
dotnet ef database update
```

### Crear nueva migración:
```bash
cd backend
dotnet ef migrations add NombreDeLaMigracion
```

### Revertir migración:
```bash
cd backend
dotnet ef database update NombreMigracionAnterior
```

### Eliminar última migración (sin aplicar):
```bash
cd backend
dotnet ef migrations remove
```

## Estructura del Proyecto

- `frontend/` - Aplicación React
- `backend/` - API .NET Core
- `basedatos.sql` - Script de creación de base de datos
- `backend/Migrations/` - Migraciones de Entity Framework

## Funcionalidades

- Gestión de productos y categorías
- Sistema de autenticación para clientes y proveedores
- Carrito de compras
- Procesamiento de órdenes y pagos
- Generación de facturas PDF
- Dashboard para proveedores