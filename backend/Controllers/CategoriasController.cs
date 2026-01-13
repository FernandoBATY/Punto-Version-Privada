using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CategoriasController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<CategoriasController> _logger;

        public CategoriasController(PuntoVentaDbContext context, ILogger<CategoriasController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<CategoriaResponse>>> GetCategorias()
        {
            try
            {
                var categorias = await _context.Categorias
                    .Select(c => new CategoriaResponse
                    {
                        CategoriaId = c.CategoriaId,
                        Nombre = c.Nombre,
                        Descripcion = c.Descripcion,
                        CantidadProductos = c.Productos.Count(p => p.Activo)
                    })
                    .OrderBy(c => c.Nombre)
                    .ToListAsync();

                return Ok(categorias);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener categorías");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<CategoriaResponse>> GetCategoria(int id)
        {
            try
            {
                var categoria = await _context.Categorias
                    .Select(c => new CategoriaResponse
                    {
                        CategoriaId = c.CategoriaId,
                        Nombre = c.Nombre,
                        Descripcion = c.Descripcion,
                        CantidadProductos = c.Productos.Count(p => p.Activo)
                    })
                    .FirstOrDefaultAsync(c => c.CategoriaId == id);

                if (categoria == null)
                {
                    return NotFound();
                }

                return Ok(categoria);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener categoría {CategoriaId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPost]
        public async Task<ActionResult<CategoriaResponse>> PostCategoria([FromBody] CrearCategoriaRequest request)
        {
            try
            {
                var categoria = new Categoria
                {
                    Nombre = request.Nombre,
                    Descripcion = request.Descripcion
                };

                _context.Categorias.Add(categoria);
                await _context.SaveChangesAsync();

                var response = new CategoriaResponse
                {
                    CategoriaId = categoria.CategoriaId,
                    Nombre = categoria.Nombre,
                    Descripcion = categoria.Descripcion,
                    CantidadProductos = 0
                };

                return CreatedAtAction(nameof(GetCategoria), new { id = categoria.CategoriaId }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear categoría");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutCategoria(int id, [FromBody] ActualizarCategoriaRequest request)
        {
            try
            {
                var categoria = await _context.Categorias.FindAsync(id);
                if (categoria == null)
                {
                    return NotFound();
                }

                categoria.Nombre = request.Nombre;
                categoria.Descripcion = request.Descripcion;

                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al actualizar categoría {CategoriaId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategoria(int id)
        {
            try
            {
                var categoria = await _context.Categorias.FindAsync(id);
                if (categoria == null)
                {
                    return NotFound();
                }

                // Verificar si hay productos asociados
                var tieneProductos = await _context.Productos
                    .AnyAsync(p => p.CategoriaId == id);

                if (tieneProductos)
                {
                    return BadRequest(new { message = "No se puede eliminar la categoría porque tiene productos asociados" });
                }

                _context.Categorias.Remove(categoria);
                await _context.SaveChangesAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al eliminar categoría {CategoriaId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
    }

    // DTOs
    public class CategoriaResponse
    {
        public int CategoriaId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public int CantidadProductos { get; set; }
    }

    public class CrearCategoriaRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
    }

    public class ActualizarCategoriaRequest
    {
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
    }
}

