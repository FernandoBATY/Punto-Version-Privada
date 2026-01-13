using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CestasController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<CestasController> _logger;

        public CestasController(PuntoVentaDbContext context, ILogger<CestasController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet("cliente/{clienteId}")]
        public async Task<ActionResult<CestaResponse>> GetCestaCliente(int clienteId)
        {
            try
            {
                var cesta = await _context.Cestas
                    .Include(c => c.Items)
                        .ThenInclude(i => i.Producto)
                            .ThenInclude(p => p.Imagenes)
                    .Include(c => c.Items)
                        .ThenInclude(i => i.Producto)
                            .ThenInclude(p => p.Proveedor)
                    .FirstOrDefaultAsync(c => c.ClienteId == clienteId);

                if (cesta == null)
                {
                    cesta = new Cesta
                    {
                        ClienteId = clienteId,
                        FechaCreacion = DateTime.UtcNow,
                        FechaActualizacion = DateTime.UtcNow
                    };
                    _context.Cestas.Add(cesta);
                    await _context.SaveChangesAsync();
                }

                var response = new CestaResponse
                {
                    CestaId = cesta.CestaId,
                    ClienteId = cesta.ClienteId,
                    FechaCreacion = cesta.FechaCreacion,
                    FechaActualizacion = cesta.FechaActualizacion,
                    Items = cesta.Items.Select(i => new ItemCestaResponse
                    {
                        ItemCestaId = i.ItemCestaId,
                        ProductoId = i.ProductoId,
                        Cantidad = i.Cantidad,
                        PrecioUnitario = i.PrecioUnitario,
                        Subtotal = i.Cantidad * i.PrecioUnitario,
                        FechaAgregado = i.FechaAgregado,
                        Producto = new ProductoInfo
                        {
                            ProductoId = i.Producto.ProductoId,
                            Nombre = i.Producto.Nombre,
                            Precio = i.Producto.Precio,
                            Stock = i.Producto.Stock,
                            ImagenPrincipal = i.Producto.Imagenes.OrderBy(img => img.Orden).FirstOrDefault()?.Url
                        }
                    }).ToList(),
                    Total = cesta.Items.Sum(i => i.Cantidad * i.PrecioUnitario)
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener cesta del cliente {ClienteId}", clienteId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPost("agregar")]
        public async Task<ActionResult> AgregarItem([FromBody] AgregarItemRequest request)
        {
            try
            {
                var producto = await _context.Productos
                    .FirstOrDefaultAsync(p => p.ProductoId == request.ProductoId && p.Activo);

                if (producto == null)
                {
                    return NotFound(new { message = "Producto no encontrado o inactivo" });
                }

                if (producto.Stock < request.Cantidad)
                {
                    return BadRequest(new { message = "Stock insuficiente" });
                }

                // Obtener o crear cesta
                var cesta = await _context.Cestas
                    .FirstOrDefaultAsync(c => c.ClienteId == request.ClienteId);

                if (cesta == null)
                {
                    cesta = new Cesta
                    {
                        ClienteId = request.ClienteId,
                        FechaCreacion = DateTime.UtcNow,
                        FechaActualizacion = DateTime.UtcNow
                    };
                    _context.Cestas.Add(cesta);
                    await _context.SaveChangesAsync();
                }

                var itemExistente = await _context.ItemsCesta
                    .FirstOrDefaultAsync(i => i.CestaId == cesta.CestaId && i.ProductoId == request.ProductoId);

                if (itemExistente != null)
                {
                    itemExistente.Cantidad += request.Cantidad;
                    itemExistente.PrecioUnitario = producto.Precio;
                }
                else
                {
                    var nuevoItem = new ItemCesta
                    {
                        CestaId = cesta.CestaId,
                        ProductoId = request.ProductoId,
                        Cantidad = request.Cantidad,
                        PrecioUnitario = producto.Precio,
                        FechaAgregado = DateTime.UtcNow
                    };
                    _context.ItemsCesta.Add(nuevoItem);
                }

                cesta.FechaActualizacion = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                return Ok(new { message = "Producto agregado a la cesta" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al agregar item a la cesta");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPut("actualizar-cantidad")]
        public async Task<ActionResult> ActualizarCantidad([FromBody] ActualizarCantidadRequest request)
        {
            try
            {
                var item = await _context.ItemsCesta
                    .Include(i => i.Producto)
                    .FirstOrDefaultAsync(i => i.ItemCestaId == request.ItemCestaId);

                if (item == null)
                {
                    return NotFound(new { message = "Item no encontrado" });
                }

                if (request.Cantidad <= 0)
                {
                    // Eliminar item si cantidad es 0 o menor
                    _context.ItemsCesta.Remove(item);
                }
                else
                {
                    // Verificar stock disponible
                    if (item.Producto.Stock < request.Cantidad)
                    {
                        return BadRequest(new { message = "Stock insuficiente" });
                    }

                    item.Cantidad = request.Cantidad;
                }

                await _context.SaveChangesAsync();

                return Ok(new { message = "Cantidad actualizada" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar cantidad del item");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpDelete("item/{itemCestaId}")]
        public async Task<ActionResult> EliminarItem(int itemCestaId)
        {
            try
            {
                var item = await _context.ItemsCesta.FindAsync(itemCestaId);
                if (item == null)
                {
                    return NotFound(new { message = "Item no encontrado" });
                }

                _context.ItemsCesta.Remove(item);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Item eliminado de la cesta" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al eliminar item de la cesta");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpDelete("limpiar/{clienteId}")]
        public async Task<ActionResult> LimpiarCesta(int clienteId)
        {
            try
            {
                var cesta = await _context.Cestas
                    .Include(c => c.Items)
                    .FirstOrDefaultAsync(c => c.ClienteId == clienteId);

                if (cesta == null)
                {
                    return NotFound(new { message = "Cesta no encontrada" });
                }

                _context.ItemsCesta.RemoveRange(cesta.Items);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Cesta limpiada" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al limpiar cesta");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
    }

    // DTOs
    public class CestaResponse
    {
        public int CestaId { get; set; }
        public int ClienteId { get; set; }
        public DateTime FechaCreacion { get; set; }
        public DateTime FechaActualizacion { get; set; }
        public List<ItemCestaResponse> Items { get; set; } = new List<ItemCestaResponse>();
        public decimal Total { get; set; }
    }

    public class ItemCestaResponse
    {
        public int ItemCestaId { get; set; }
        public int ProductoId { get; set; }
        public int Cantidad { get; set; }
        public decimal PrecioUnitario { get; set; }
        public decimal Subtotal { get; set; }
        public DateTime FechaAgregado { get; set; }
        public ProductoInfo Producto { get; set; } = null!;
    }

    public class ProductoInfo
    {
        public int ProductoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public decimal Precio { get; set; }
        public int Stock { get; set; }
        public string? ImagenPrincipal { get; set; }
    }

    public class AgregarItemRequest
    {
        public int ClienteId { get; set; }
        public int ProductoId { get; set; }
        public int Cantidad { get; set; }
    }

    public class ActualizarCantidadRequest
    {
        public int ItemCestaId { get; set; }
        public int Cantidad { get; set; }
    }
}
