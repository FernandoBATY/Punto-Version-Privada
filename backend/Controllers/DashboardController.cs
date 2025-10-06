using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DashboardController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<DashboardController> _logger;

        public DashboardController(PuntoVentaDbContext context, ILogger<DashboardController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("proveedor/{proveedorId}")]
        public async Task<ActionResult<DashboardProveedorResponse>> GetDashboardProveedor(int proveedorId)
        {
            try
            {
                // Verificar que el proveedor existe
                var proveedor = await _context.Proveedores.FindAsync(proveedorId);
                if (proveedor == null)
                {
                    return NotFound(new { message = "Proveedor no encontrado" });
                }

                // Estadísticas de productos
                var totalProductos = await _context.Productos
                    .Where(p => p.ProveedorId == proveedorId)
                    .CountAsync();

                var productosActivos = await _context.Productos
                    .Where(p => p.ProveedorId == proveedorId && p.Activo)
                    .CountAsync();

                var productosSinStock = await _context.Productos
                    .Where(p => p.ProveedorId == proveedorId && p.Stock == 0)
                    .CountAsync();

                // Estadísticas de ventas
                // Evitar null en SUM cuando no hay filas
                var totalVentas = await _context.Ordenes
                    .Where(o => o.ProveedorId == proveedorId && o.EstadoOrden == "Pagado")
                    .SumAsync(o => (decimal?)o.Total) ?? 0m;

                var totalOrdenes = await _context.Ordenes
                    .Where(o => o.ProveedorId == proveedorId)
                    .CountAsync();

                var ordenesPagadas = await _context.Ordenes
                    .Where(o => o.ProveedorId == proveedorId && o.EstadoOrden == "Pagado")
                    .CountAsync();

                // Ventas por mes (últimos 6 meses)
                var fechaInicio = DateTime.UtcNow.AddMonths(-6);
                var ventasPorMes = await _context.Ordenes
                    .Where(o => o.ProveedorId == proveedorId && 
                               o.EstadoOrden == "Pagado" && 
                               o.FechaCreacion >= fechaInicio)
                    .GroupBy(o => new { o.FechaCreacion.Year, o.FechaCreacion.Month })
                    .Select(g => new VentasPorMes
                    {
                        Año = g.Key.Year,
                        Mes = g.Key.Month,
                        Total = g.Sum(o => o.Total),
                        CantidadOrdenes = g.Count()
                    })
                    .OrderBy(v => v.Año)
                    .ThenBy(v => v.Mes)
                    .ToListAsync();

                // Productos más vendidos
                var productosMasVendidos = await _context.ItemsOrden
                    .Include(i => i.Producto)
                    .Where(i => i.Orden.ProveedorId == proveedorId && i.Orden.EstadoOrden == "Pagado")
                    .GroupBy(i => i.ProductoId)
                    .Select(g => new ProductoVendido
                    {
                        ProductoId = g.Key,
                        Nombre = g.First().Producto.Nombre,
                        CantidadVendida = g.Sum(i => i.Cantidad),
                        // No usar Subtotal (NotMapped). Calcular en SQL.
                        TotalVentas = g.Sum(i => i.Cantidad * i.PrecioUnitario)
                    })
                    .OrderByDescending(p => p.CantidadVendida)
                    .Take(10)
                    .ToListAsync();

                // Estados de órdenes
                var estadosOrdenes = await _context.Ordenes
                    .Where(o => o.ProveedorId == proveedorId)
                    .GroupBy(o => o.EstadoOrden)
                    .Select(g => new EstadoOrden
                    {
                        Estado = g.Key,
                        Cantidad = g.Count()
                    })
                    .ToListAsync();

                var response = new DashboardProveedorResponse
                {
                    ProveedorId = proveedorId,
                    FechaConsulta = DateTime.UtcNow,
                    EstadisticasProductos = new EstadisticasProductos
                    {
                        TotalProductos = totalProductos,
                        ProductosActivos = productosActivos,
                        ProductosSinStock = productosSinStock
                    },
                    EstadisticasVentas = new EstadisticasVentas
                    {
                        TotalVentas = totalVentas,
                        TotalOrdenes = totalOrdenes,
                        OrdenesPagadas = ordenesPagadas,
                        TasaConversion = totalOrdenes > 0 ? (decimal)ordenesPagadas / totalOrdenes * 100 : 0
                    },
                    VentasPorMes = ventasPorMes,
                    ProductosMasVendidos = productosMasVendidos,
                    EstadosOrdenes = estadosOrdenes
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener dashboard del proveedor {ProveedorId}", proveedorId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("productos/{proveedorId}")]
        public async Task<ActionResult<IEnumerable<ProductoDashboardResponse>>> GetProductosDashboard(int proveedorId)
        {
            try
            {
                var productos = await _context.Productos
                    .Include(p => p.Categoria)
                    .Include(p => p.TipoProducto)
                    .Where(p => p.ProveedorId == proveedorId)
                    .Select(p => new ProductoDashboardResponse
                    {
                        ProductoId = p.ProductoId,
                        Nombre = p.Nombre,
                        Precio = p.Precio,
                        Stock = p.Stock,
                        Activo = p.Activo,
                        FechaCreacion = p.FechaCreacion,
                        Categoria = p.Categoria != null ? p.Categoria.Nombre : "Sin categoría",
                        TipoProducto = p.TipoProducto != null ? p.TipoProducto.Nombre : "Sin tipo",
                        // Coalesce a 0 cuando no hay ventas
                        CantidadVendida = _context.ItemsOrden
                            .Where(i => i.ProductoId == p.ProductoId && i.Orden.EstadoOrden == "Pagado")
                            .Sum(i => (int?)i.Cantidad) ?? 0,
                        // Calcular subtotal en SQL para evitar NotMapped
                        TotalVentas = _context.ItemsOrden
                            .Where(i => i.ProductoId == p.ProductoId && i.Orden.EstadoOrden == "Pagado")
                            .Sum(i => (decimal?)(i.Cantidad * i.PrecioUnitario)) ?? 0m
                    })
                    .OrderByDescending(p => p.TotalVentas)
                    .ToListAsync();

                return Ok(productos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener productos del dashboard para proveedor {ProveedorId}", proveedorId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("ordenes/{proveedorId}")]
        public async Task<ActionResult<IEnumerable<OrdenDashboardResponse>>> GetOrdenesDashboard(int proveedorId)
        {
            try
            {
                var ordenes = await _context.Ordenes
                    .Include(o => o.Cliente)
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Producto)
                    .Where(o => o.ProveedorId == proveedorId)
                    .OrderByDescending(o => o.FechaCreacion)
                    .Take(20)
                    .Select(o => new OrdenDashboardResponse
                    {
                        OrdenId = o.OrdenId,
                        ClienteNombre = o.Cliente.Nombre + " " + o.Cliente.Apellido,
                        EstadoOrden = o.EstadoOrden,
                        Total = o.Total,
                        FechaCreacion = o.FechaCreacion,
                        FechaPago = o.FechaPago,
                        CantidadItems = o.Items.Count,
                        Productos = o.Items.Select(i => new ProductoOrdenInfo
                        {
                            Nombre = i.Producto.Nombre,
                            Cantidad = i.Cantidad,
                            PrecioUnitario = i.PrecioUnitario
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(ordenes);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener órdenes del dashboard para proveedor {ProveedorId}", proveedorId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
    }

    // DTOs
    public class DashboardProveedorResponse
    {
        public int ProveedorId { get; set; }
        public DateTime FechaConsulta { get; set; }
        public EstadisticasProductos EstadisticasProductos { get; set; } = null!;
        public EstadisticasVentas EstadisticasVentas { get; set; } = null!;
        public List<VentasPorMes> VentasPorMes { get; set; } = new List<VentasPorMes>();
        public List<ProductoVendido> ProductosMasVendidos { get; set; } = new List<ProductoVendido>();
        public List<EstadoOrden> EstadosOrdenes { get; set; } = new List<EstadoOrden>();
    }

    public class EstadisticasProductos
    {
        public int TotalProductos { get; set; }
        public int ProductosActivos { get; set; }
        public int ProductosSinStock { get; set; }
    }

    public class EstadisticasVentas
    {
        public decimal TotalVentas { get; set; }
        public int TotalOrdenes { get; set; }
        public int OrdenesPagadas { get; set; }
        public decimal TasaConversion { get; set; }
    }

    public class VentasPorMes
    {
        public int Año { get; set; }
        public int Mes { get; set; }
        public decimal Total { get; set; }
        public int CantidadOrdenes { get; set; }
    }

    public class ProductoVendido
    {
        public int ProductoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public int CantidadVendida { get; set; }
        public decimal TotalVentas { get; set; }
    }

    public class EstadoOrden
    {
        public string Estado { get; set; } = string.Empty;
        public int Cantidad { get; set; }
    }

    public class ProductoDashboardResponse
    {
        public int ProductoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public decimal Precio { get; set; }
        public int Stock { get; set; }
        public bool Activo { get; set; }
        public DateTime FechaCreacion { get; set; }
        public string Categoria { get; set; } = string.Empty;
        public string TipoProducto { get; set; } = string.Empty;
        public int CantidadVendida { get; set; }
        public decimal TotalVentas { get; set; }
    }

    public class OrdenDashboardResponse
    {
        public int OrdenId { get; set; }
        public string ClienteNombre { get; set; } = string.Empty;
        public string EstadoOrden { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public DateTime FechaCreacion { get; set; }
        public DateTime? FechaPago { get; set; }
        public int CantidadItems { get; set; }
        public List<ProductoOrdenInfo> Productos { get; set; } = new List<ProductoOrdenInfo>();
    }

    public class ProductoOrdenInfo
    {
        public string Nombre { get; set; } = string.Empty;
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
    }
}

