CREATE TABLE Clientes (
    ClienteId INT IDENTITY(1,1) PRIMARY KEY,
    Correo NVARCHAR(255) NOT NULL UNIQUE,
    Contrasena NVARCHAR(255) NOT NULL,  
    Nombre NVARCHAR(100) NOT NULL,
    Apellido NVARCHAR(100) NOT NULL,
    RFC NVARCHAR(13) NULL,
    Telefono NVARCHAR(20) NULL,
    FechaCreacion DATETIME2(3) DEFAULT SYSUTCDATETIME(),
    RegimenFiscal NVARCHAR(3) NOT NULL,
    CodigoPostal NVARCHAR(5),
    UsoCFDI NVARCHAR(3)
);
CREATE TABLE Proveedores (
    ProveedorId INT IDENTITY(1,1) PRIMARY KEY,
    Correo NVARCHAR(255) NOT NULL UNIQUE,
    Contrasena NVARCHAR(255) NOT NULL, 
    Nombre NVARCHAR(100) NOT NULL,
    Apellido NVARCHAR(100) NOT NULL,
    RFC NVARCHAR(13) NULL,
    Telefono NVARCHAR(20) NULL,
    FechaCreacion DATETIME2(3) DEFAULT SYSUTCDATETIME(),
    RegimenFiscal NVARCHAR(3),
    CodigoPostal NVARCHAR(5)
);

CREATE TABLE Categorias (
    CategoriaId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE,
    Descripcion NVARCHAR(500) NULL
);
CREATE TABLE TiposProducto (
    TipoProductoId INT IDENTITY(1,1) PRIMARY KEY,
    Nombre NVARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE Productos (
    ProductoId INT IDENTITY(1,1) PRIMARY KEY,
    ProveedorId INT NOT NULL REFERENCES Proveedores(ProveedorId),
    Nombre NVARCHAR(200) NOT NULL,
    Descripcion NVARCHAR(1000) NULL,
    CategoriaId INT NULL REFERENCES Categorias(CategoriaId),
    TipoProductoId INT NULL REFERENCES TiposProducto(TipoProductoId),
    Precio DECIMAL(10,2) NOT NULL CHECK (Precio >= 0),
    Stock INT NOT NULL DEFAULT 0,
    Activo BIT NOT NULL DEFAULT 1,
    FechaCreacion DATETIME2(3) DEFAULT SYSUTCDATETIME()
);

CREATE TABLE ImagenesProducto (
    ImagenId INT IDENTITY(1,1) PRIMARY KEY,
    ProductoId INT NOT NULL REFERENCES Productos(ProductoId) ON DELETE CASCADE,
    Url NVARCHAR(1000) NOT NULL,
    Orden INT NOT NULL DEFAULT 0
);

CREATE TABLE Cestas (
    CestaId INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NOT NULL REFERENCES Clientes(ClienteId),
    FechaCreacion DATETIME2(3) DEFAULT SYSUTCDATETIME(),
    FechaActualizacion DATETIME2(3) DEFAULT SYSUTCDATETIME()
);

CREATE TABLE ItemsCesta (
    ItemCestaId INT IDENTITY(1,1) PRIMARY KEY,
    CestaId INT NOT NULL REFERENCES Cestas(CestaId) ON DELETE CASCADE,
    ProductoId INT NOT NULL REFERENCES Productos(ProductoId),
    Cantidad INT NOT NULL CHECK (Cantidad > 0),
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    FechaAgregado DATETIME2(3) DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Cesta_Producto UNIQUE (CestaId, ProductoId)
);

CREATE TABLE Ordenes (
    OrdenId INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NOT NULL REFERENCES Clientes(ClienteId),
    ProveedorId INT NOT NULL REFERENCES Proveedores(ProveedorId),
    EstadoOrden NVARCHAR(50) NOT NULL DEFAULT 'Pendiente',
    Total DECIMAL(12,2) NOT NULL CHECK (Total >= 0),
    FechaCreacion DATETIME2(3) DEFAULT SYSUTCDATETIME(),
    FechaPago DATETIME2(3) NULL
);

CREATE TABLE ItemsOrden (
    ItemOrdenId INT IDENTITY(1,1) PRIMARY KEY,
    OrdenId INT NOT NULL REFERENCES Ordenes(OrdenId) ON DELETE CASCADE,
    ProductoId INT NOT NULL REFERENCES Productos(ProductoId),
    Cantidad INT NOT NULL CHECK (Cantidad > 0),
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal AS (Cantidad * PrecioUnitario) PERSISTED
);

CREATE TABLE Pagos (
    PagoId INT IDENTITY(1,1) PRIMARY KEY,
    OrdenId INT NOT NULL REFERENCES Ordenes(OrdenId),
    MetodoPago NVARCHAR(50) NOT NULL,
    Monto DECIMAL(12,2) NOT NULL CHECK (Monto >= 0),
    Estado NVARCHAR(50) NOT NULL DEFAULT 'Procesando',
    FechaCreacion DATETIME2(3) DEFAULT SYSUTCDATETIME()
);

CREATE TABLE Facturas (
    FacturaId INT IDENTITY(1,1) PRIMARY KEY,
    OrdenId INT NOT NULL REFERENCES Ordenes(OrdenId) UNIQUE,
    NumeroFactura NVARCHAR(100) NOT NULL UNIQUE,
    UUID CHAR(36) NOT NULL,
    FechaEmision DATETIME2(3) DEFAULT SYSUTCDATETIME(),
    Total DECIMAL(12,2) NOT NULL,
    FacturaXML NVARCHAR(MAX) NULL,
    FechaTimbrado DATETIME2(3) NULL,
    Serie NVARCHAR(10) DEFAULT 'A',
    Folio INT NOT NULL IDENTITY(1,1),
    LugarExpedicion NVARCHAR(5) NOT NULL,
    MetodoPago CHAR(3) NOT NULL DEFAULT 'PUE',
    FormaPago CHAR(2) NOT NULL DEFAULT '03';
);
CREATE TABLE ItemsFactura (
    ItemFacturaId INT IDENTITY(1,1) PRIMARY KEY,
    FacturaId INT NOT NULL REFERENCES Facturas(FacturaId) ON DELETE CASCADE,
    ProductoId INT NOT NULL REFERENCES Productos(ProductoId),
    Cantidad INT NOT NULL CHECK (Cantidad > 0),
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal AS (Cantidad * PrecioUnitario) PERSISTED
);

