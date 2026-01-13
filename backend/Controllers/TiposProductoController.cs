using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TiposProductoController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<TiposProductoController> _logger;

        public TiposProductoController(PuntoVentaDbContext context, ILogger<TiposProductoController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TipoProductoResponse>>> GetTiposProducto()
        {
            try
            {
                var tipos = await _context.TiposProducto
                    .Select(t => new TipoProductoResponse
                    {
                        TipoProductoId = t.TipoProductoId,
                        Nombre = t.Nombre,
                        CantidadProductos = t.Productos.Count(p => p.Activo)
                    })
                    .OrderBy(t => t.Nombre)
                    .ToListAsync();

                return Ok(tipos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener tipos de producto");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TipoProductoResponse>> GetTipoProducto(int id)
        {
            try
            {
                var tipo = await _context.TiposProducto
                    .Select(t => new TipoProductoResponse
                    {
                        TipoProductoId = t.TipoProductoId,
                        Nombre = t.Nombre,
                        CantidadProductos = t.Productos.Count(p => p.Activo)
                    })
                    .FirstOrDefaultAsync(t => t.TipoProductoId == id);

                if (tipo == null)
                {
                    return NotFound();
                }

                return Ok(tipo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener tipo de producto {TipoProductoId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPost]
        public async Task<ActionResult<TipoProductoResponse>> PostTipoProducto([FromBody] CrearTipoProductoRequest request)
        {
            try
            {
                var tipo = new TipoProducto
                {
                    Nombre = request.Nombre
                };

                _context.TiposProducto.Add(tipo);
                await _context.SaveChangesAsync();

                var response = new TipoProductoResponse
                {
                    TipoProductoId = tipo.TipoProductoId,
                    Nombre = tipo.Nombre,
                    CantidadProductos = 0
                };

                return CreatedAtAction(nameof(GetTipoProducto), new { id = tipo.TipoProductoId }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear tipo de producto");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutTipoProducto(int id, [FromBody] ActualizarTipoProductoRequest request)
        {
            try
            {
                var tipo = await _context.TiposProducto.FindAsync(id);
                if (tipo == null)
                {
                    return NotFound();
                }

                tipo.Nombre = request.Nombre;

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar tipo de producto {TipoProductoId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTipoProducto(int id)
        {
            try
            {
                var tipo = await _context.TiposProducto.FindAsync(id);
                if (tipo == null)
                {
                    return NotFound();
                }

                // Verificar si hay productos asociados
                var tieneProductos = await _context.Productos
                    .AnyAsync(p => p.TipoProductoId == id);

                if (tieneProductos)
                {
                    return BadRequest(new { message = "No se puede eliminar el tipo de producto porque tiene productos asociados" });
                }

                _context.TiposProducto.Remove(tipo);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al eliminar tipo de producto {TipoProductoId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
    }

    // DTOs
    public class TipoProductoResponse
    {
        public int TipoProductoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public int CantidadProductos { get; set; }
    }

    public class CrearTipoProductoRequest
    {
        public string Nombre { get; set; } = string.Empty;
    }

    public class ActualizarTipoProductoRequest
    {
        public string Nombre { get; set; } = string.Empty;
    }
}

