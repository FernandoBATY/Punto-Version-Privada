
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

### 3. Crear la base de datos:
Abre **SQL Server Management Studio** y ejecuta el archivo `basedatos.sql` (ubicado en la raíz del proyecto) para crear todas las tablas y restricciones necesarias.

## Ejecución

### Ejecutar ambos proyectos (desde la carpeta `frontend`):
```bash
npm run start:all
```

Esto iniciará:
- Backend en http://localhost:5028
- Frontend en http://localhost:3000
- Swagger UI en http://localhost:5028/swagger/index.html

## Estructura del Proyecto

- `frontend/` - Aplicación React
- `backend/` - API .NET Core
- `basedatos.sql` - Script de creación de base de datos (ejecutar en SQL Server)

## Funcionalidades

- Gestión de productos y categorías
- Sistema de autenticación para clientes y proveedores
- Carrito de compras
- Procesamiento de órdenes y pagos
- Generación de facturas PDF
- Dashboard para proveedores