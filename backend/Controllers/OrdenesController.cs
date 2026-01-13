using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using PuntoVenta.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class OrdenesController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<OrdenesController> _logger;

        public OrdenesController(PuntoVentaDbContext context, ILogger<OrdenesController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("crear")]
        public async Task<ActionResult<OrdenResponse>> CrearOrden([FromBody] CrearOrdenRequest request)
        {
            try
            {
                // Verificar que el cliente existe
                var cliente = await _context.Clientes.FindAsync(request.ClienteId);
                if (cliente == null)
                {
                    return NotFound(new { message = "Cliente no encontrado" });
                }

                // Obtener cesta del cliente
                var cesta = await _context.Cestas
                    .Include(c => c.Items)
                        .ThenInclude(i => i.Producto)
                    .FirstOrDefaultAsync(c => c.ClienteId == request.ClienteId);

                if (cesta == null || !cesta.Items.Any())
                {
                    return BadRequest(new { message = "La cesta está vacía" });
                }

                // Verificar stock y calcular total
                decimal total = 0;
                var itemsOrden = new List<ItemOrden>();

                foreach (var item in cesta.Items)
                {
                    if (item.Producto.Stock < item.Cantidad)
                    {
                        return BadRequest(new { message = $"Stock insuficiente para el producto: {item.Producto.Nombre}" });
                    }

                    var subtotal = item.Cantidad * item.PrecioUnitario;
                    total += subtotal;

                    itemsOrden.Add(new ItemOrden
                    {
                        ProductoId = item.ProductoId,
                        Cantidad = item.Cantidad,
                        PrecioUnitario = item.PrecioUnitario
                    });
                }

                // Crear orden
                var orden = new Orden
                {
                    ClienteId = request.ClienteId,
                    ProveedorId = request.ProveedorId,
                    EstadoOrden = "Pendiente",
                    Total = total,
                    FechaCreacion = DateTime.UtcNow
                };

                _context.Ordenes.Add(orden);
                await _context.SaveChangesAsync();

                // Agregar items a la orden
                foreach (var item in itemsOrden)
                {
                    item.OrdenId = orden.OrdenId;
                }
                _context.ItemsOrden.AddRange(itemsOrden);

                // Limpiar cesta
                _context.ItemsCesta.RemoveRange(cesta.Items);

                await _context.SaveChangesAsync();

                var response = new OrdenResponse
                {
                    OrdenId = orden.OrdenId,
                    ClienteId = orden.ClienteId,
                    ProveedorId = orden.ProveedorId,
                    EstadoOrden = orden.EstadoOrden,
                    Total = orden.Total,
                    FechaCreacion = orden.FechaCreacion,
                    Items = itemsOrden.Select(i => new ItemOrdenResponse
                    {
                        ItemOrdenId = i.ItemOrdenId,
                        ProductoId = i.ProductoId,
                        Cantidad = i.Cantidad,
                        PrecioUnitario = i.PrecioUnitario,
                        Subtotal = i.Subtotal
                    }).ToList()
                };

                return CreatedAtAction(nameof(GetOrden), new { id = orden.OrdenId }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear orden");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        // Crear múltiples órdenes por proveedor desde la cesta del cliente
        [HttpPost("crear-multiproveedor")]
        public async Task<ActionResult<CrearOrdenesMultiproveedorResponse>> CrearOrdenesMultiproveedor([FromBody] CrearOrdenMultiproveedorRequest request)
        {
            try
            {
                var cliente = await _context.Clientes.FindAsync(request.ClienteId);
                if (cliente == null)
                {
                    return NotFound(new { message = "Cliente no encontrado" });
                }

                var cesta = await _context.Cestas
                    .Include(c => c.Items)
                        .ThenInclude(i => i.Producto)
                    .FirstOrDefaultAsync(c => c.ClienteId == request.ClienteId);

                if (cesta == null || !cesta.Items.Any())
                {
                    return BadRequest(new { message = "La cesta está vacía" });
                }

                var itemsPorProveedor = cesta.Items
                    .GroupBy(i => i.Producto.ProveedorId)
                    .ToList();

                var createdOrders = new List<OrdenResponse>();

                foreach (var grupo in itemsPorProveedor)
                {
                    decimal total = 0;
                    var itemsOrden = new List<ItemOrden>();

                    foreach (var item in grupo)
                    {
                        if (item.Producto.Stock < item.Cantidad)
                        {
                            return BadRequest(new { message = $"Stock insuficiente para el producto: {item.Producto.Nombre}" });
                        }

                        var subtotal = item.Cantidad * item.PrecioUnitario;
                        total += subtotal;

                        itemsOrden.Add(new ItemOrden
                        {
                            ProductoId = item.ProductoId,
                            Cantidad = item.Cantidad,
                            PrecioUnitario = item.PrecioUnitario
                        });
                    }

                    var orden = new Orden
                    {
                        ClienteId = request.ClienteId,
                        ProveedorId = grupo.Key,
                        EstadoOrden = "Pendiente",
                        Total = total,
                        FechaCreacion = DateTime.UtcNow
                    };

                    _context.Ordenes.Add(orden);
                    await _context.SaveChangesAsync();

                    foreach (var item in itemsOrden)
                    {
                        item.OrdenId = orden.OrdenId;
                    }
                    _context.ItemsOrden.AddRange(itemsOrden);
                    await _context.SaveChangesAsync();

                    createdOrders.Add(new OrdenResponse
                    {
                        OrdenId = orden.OrdenId,
                        ClienteId = orden.ClienteId,
                        ProveedorId = orden.ProveedorId,
                        EstadoOrden = orden.EstadoOrden,
                        Total = orden.Total,
                        FechaCreacion = orden.FechaCreacion,
                        Items = itemsOrden.Select(i => new ItemOrdenResponse
                        {
                            ItemOrdenId = i.ItemOrdenId,
                            ProductoId = i.ProductoId,
                            Cantidad = i.Cantidad,
                            PrecioUnitario = i.PrecioUnitario,
                            Subtotal = i.Subtotal
                        }).ToList()
                    });
                }

                // Limpiar toda la cesta tras crear órdenes
                _context.ItemsCesta.RemoveRange(cesta.Items);
                await _context.SaveChangesAsync();

                var resp = new CrearOrdenesMultiproveedorResponse
                {
                    ClienteId = request.ClienteId,
                    Ordenes = createdOrders,
                    TotalGlobal = createdOrders.Sum(o => o.Total)
                };

                return Ok(resp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear órdenes multiproveedor");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<OrdenResponse>> GetOrden(int id)
        {
            try
            {
                var orden = await _context.Ordenes
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Producto)
                    .Include(o => o.Cliente)
                    .Include(o => o.Proveedor)
                    .FirstOrDefaultAsync(o => o.OrdenId == id);

                if (orden == null)
                {
                    return NotFound();
                }

                var response = new OrdenResponse
                {
                    OrdenId = orden.OrdenId,
                    ClienteId = orden.ClienteId,
                    ProveedorId = orden.ProveedorId,
                    EstadoOrden = orden.EstadoOrden,
                    Total = orden.Total,
                    FechaCreacion = orden.FechaCreacion,
                    FechaPago = orden.FechaPago,
                    Cliente = new ClienteInfo
                    {
                        ClienteId = orden.Cliente.ClienteId,
                        Nombre = orden.Cliente.Nombre,
                        Apellido = orden.Cliente.Apellido,
                        Correo = orden.Cliente.Correo
                    },
                    Proveedor = new ProveedorInfo
                    {
                        ProveedorId = orden.Proveedor.ProveedorId,
                        Nombre = orden.Proveedor.Nombre,
                        Apellido = orden.Proveedor.Apellido
                    },
                    Items = orden.Items.Select(i => new ItemOrdenResponse
                    {
                        ItemOrdenId = i.ItemOrdenId,
                        ProductoId = i.ProductoId,
                        Cantidad = i.Cantidad,
                        PrecioUnitario = i.PrecioUnitario,
                        Subtotal = i.Subtotal,
                        Producto = new ProductoInfo
                        {
                            ProductoId = i.Producto.ProductoId,
                            Nombre = i.Producto.Nombre,
                            Precio = i.Producto.Precio
                        }
                    }).ToList()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener orden {OrdenId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("cliente/{clienteId}")]
        public async Task<ActionResult<IEnumerable<OrdenResponse>>> GetOrdenesCliente(int clienteId)
        {
            try
            {
                var ordenes = await _context.Ordenes
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Producto)
                    .Include(o => o.Proveedor)
                    .Where(o => o.ClienteId == clienteId)
                    .OrderByDescending(o => o.FechaCreacion)
                    .ToListAsync();

                var response = ordenes.Select(o => new OrdenResponse
                {
                    OrdenId = o.OrdenId,
                    ClienteId = o.ClienteId,
                    ProveedorId = o.ProveedorId,
                    EstadoOrden = o.EstadoOrden,
                    Total = o.Total,
                    FechaCreacion = o.FechaCreacion,
                    FechaPago = o.FechaPago,
                    Proveedor = new ProveedorInfo
                    {
                        ProveedorId = o.Proveedor.ProveedorId,
                        Nombre = o.Proveedor.Nombre,
                        Apellido = o.Proveedor.Apellido
                    },
                    Items = o.Items.Select(i => new ItemOrdenResponse
                    {
                        ItemOrdenId = i.ItemOrdenId,
                        ProductoId = i.ProductoId,
                        Cantidad = i.Cantidad,
                        PrecioUnitario = i.PrecioUnitario,
                        Subtotal = i.Subtotal,
                        Producto = new ProductoInfo
                        {
                            ProductoId = i.Producto.ProductoId,
                            Nombre = i.Producto.Nombre,
                            Precio = i.Producto.Precio
                        }
                    }).ToList()
                });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener órdenes del cliente {ClienteId}", clienteId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPut("{id}/estado")]
        public async Task<ActionResult> ActualizarEstado(int id, [FromBody] ActualizarEstadoRequest request)
        {
            try
            {
                var orden = await _context.Ordenes.FindAsync(id);
                if (orden == null)
                {
                    return NotFound(new { message = "Orden no encontrada" });
                }

                orden.EstadoOrden = request.EstadoOrden;
                if (request.EstadoOrden == "Pagado")
                {
                    orden.FechaPago = DateTime.UtcNow;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Estado actualizado" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar estado de la orden {OrdenId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
    }

    // DTOs
    public class CrearOrdenRequest
    {
        public int ClienteId { get; set; }
        public int ProveedorId { get; set; }
    }

    public class CrearOrdenMultiproveedorRequest
    {
        public int ClienteId { get; set; }
    }

    public class OrdenResponse
    {
        public int OrdenId { get; set; }
        public int ClienteId { get; set; }
        public int ProveedorId { get; set; }
        public string EstadoOrden { get; set; } = string.Empty;
        public decimal Total { get; set; }
        public DateTime FechaCreacion { get; set; }
        public DateTime? FechaPago { get; set; }
        public ClienteInfo? Cliente { get; set; }
        public ProveedorInfo? Proveedor { get; set; }
        public List<ItemOrdenResponse> Items { get; set; } = new List<ItemOrdenResponse>();
    }

    public class ItemOrdenResponse
    {
        public int ItemOrdenId { get; set; }
        public int ProductoId { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
        public decimal Subtotal { get; set; }
        public ProductoInfo? Producto { get; set; }
    }

    public class ClienteInfo
    {
        public int ClienteId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
    }

    public class ProveedorInfo
    {
        public int ProveedorId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
    }


    public class ActualizarEstadoRequest
    {
        public string EstadoOrden { get; set; } = string.Empty;
    }

    public class CrearOrdenesMultiproveedorResponse
    {
        public int ClienteId { get; set; }
        public List<OrdenResponse> Ordenes { get; set; } = new List<OrdenResponse>();
        public decimal TotalGlobal { get; set; }
    }
}
