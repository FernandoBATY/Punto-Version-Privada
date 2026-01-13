using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using PuntoVenta.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Http;
using System.IO;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductosController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<ProductosController> _logger;

        public ProductosController(PuntoVentaDbContext context, ILogger<ProductosController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<ProductoResponse>>> GetProductos(
            [FromQuery] string? nombre = null,
            [FromQuery] int? categoriaId = null,
            [FromQuery] int? tipoProductoId = null,
            [FromQuery] decimal? precioMin = null,
            [FromQuery] decimal? precioMax = null,
            [FromQuery] int? proveedorId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.Productos
                .Include(p => p.Proveedor)
                .Include(p => p.Categoria)
                .Include(p => p.TipoProducto)
                .Include(p => p.Imagenes)
                .Where(p => p.Activo);

            // Aplicar filtros
            if (!string.IsNullOrEmpty(nombre))
            {
                query = query.Where(p => p.Nombre.Contains(nombre));
            }

            if (categoriaId.HasValue)
            {
                query = query.Where(p => p.CategoriaId == categoriaId.Value);
            }

            if (tipoProductoId.HasValue)
            {
                query = query.Where(p => p.TipoProductoId == tipoProductoId.Value);
            }

            if (precioMin.HasValue)
            {
                query = query.Where(p => p.Precio >= precioMin.Value);
            }

            if (precioMax.HasValue)
            {
                query = query.Where(p => p.Precio <= precioMax.Value);
            }

            if (proveedorId.HasValue)
            {
                query = query.Where(p => p.ProveedorId == proveedorId.Value);
            }

            // Paginación
            var totalCount = await query.CountAsync();
            var productos = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var response = productos.Select(p => new ProductoResponse
            {
                ProductoId = p.ProductoId,
                Nombre = p.Nombre,
                Descripcion = p.Descripcion,
                Precio = p.Precio,
                Stock = p.Stock,
                Activo = p.Activo,
                FechaCreacion = p.FechaCreacion,
                Proveedor = new ProveedorInfo
                {
                    ProveedorId = p.Proveedor.ProveedorId,
                    Nombre = p.Proveedor.Nombre,
                    Apellido = p.Proveedor.Apellido
                },
                Categoria = p.Categoria != null ? new CategoriaInfo
                {
                    CategoriaId = p.Categoria.CategoriaId,
                    Nombre = p.Categoria.Nombre
                } : null,
                TipoProducto = p.TipoProducto != null ? new TipoProductoInfo
                {
                    TipoProductoId = p.TipoProducto.TipoProductoId,
                    Nombre = p.TipoProducto.Nombre
                } : null,
                Imagenes = p.Imagenes.Select(i => new ImagenInfo
                {
                    ImagenId = i.ImagenId,
                    Url = i.Url,
                    Orden = i.Orden
                }).ToList()
            });

            return Ok(new ProductosPaginadosResponse
            {
                Productos = response,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Producto>> GetProducto(int id)
        {
            var producto = await _context.Productos
                .Include(p => p.Proveedor)
                .Include(p => p.Categoria)
                .Include(p => p.TipoProducto)
                .Include(p => p.Imagenes)
                .FirstOrDefaultAsync(p => p.ProductoId == id);

            if (producto == null)
            {
                return NotFound();
            }

            return producto;
        }

        [HttpPost]
        public async Task<ActionResult<Producto>> PostProducto(Producto producto)
        {
            _context.Productos.Add(producto);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetProducto", new { id = producto.ProductoId }, producto);
        }

        // Crear producto con imagen (multipart/form-data)
        [HttpPost("con-imagen")]
        [RequestSizeLimit(10_000_000)] // 10 MB
        public async Task<ActionResult> PostProductoConImagen(
            [FromForm] int proveedorId,
            [FromForm] string nombre,
            [FromForm] string precio, // usar string para controlar cultura
            [FromForm] int stock,
            [FromForm] string? descripcion,
            [FromForm] int? categoriaId,
            [FromForm] int? tipoProductoId,
            [FromForm] bool activo,
            [FromForm] IFormFile? imagen)
        {
            try
            {
                // Parseo de precio con InvariantCulture
                if (!decimal.TryParse(precio, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out var precioDecimal))
                {
                    return BadRequest(new { message = "Precio inválido" });
                }

                var producto = new Producto
                {
                    ProveedorId = proveedorId,
                    Nombre = nombre,
                    Precio = precioDecimal,
                    Stock = stock,
                    Descripcion = descripcion,
                    CategoriaId = categoriaId,
                    TipoProductoId = tipoProductoId,
                    Activo = activo,
                    FechaCreacion = DateTime.UtcNow
                };

                _context.Productos.Add(producto);
                await _context.SaveChangesAsync();

                if (imagen != null && imagen.Length > 0)
                {
                    // Guardar en la carpeta media del frontend
                    var frontendMediaPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "frontend", "public", "media");
                    if (!Directory.Exists(frontendMediaPath))
                    {
                        Directory.CreateDirectory(frontendMediaPath);
                    }

                    var extension = Path.GetExtension(imagen.FileName);
                    if (string.IsNullOrWhiteSpace(extension)) extension = ".jpg";
                    var fileName = $"producto_{producto.ProductoId}_{Guid.NewGuid():N}{extension}";
                    var filePath = Path.Combine(frontendMediaPath, fileName);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await imagen.CopyToAsync(stream);
                    }

                    var imagenProducto = new ImagenProducto
                    {
                        ProductoId = producto.ProductoId,
                        Url = $"/media/{fileName}",
                        Orden = 0
                    };
                    _context.ImagenesProducto.Add(imagenProducto);
                    await _context.SaveChangesAsync();
                }

                return CreatedAtAction("GetProducto", new { id = producto.ProductoId }, new { productoId = producto.ProductoId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al crear producto con imagen");
                return StatusCode(500, new { message = "Error interno al subir la imagen o crear el producto" });
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutProducto(int id, Producto producto)
        {
            if (id != producto.ProductoId)
            {
                return BadRequest();
            }

            _context.Entry(producto).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!ProductoExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProducto(int id)
        {
            var producto = await _context.Productos.FindAsync(id);
            if (producto == null)
            {
                return NotFound();
            }

            producto.Activo = false;
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ProductoExists(int id)
        {
            return _context.Productos.Any(e => e.ProductoId == id);
        }
    }

    // DTOs para respuestas
    public class ProductoResponse
    {
        public int ProductoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? Descripcion { get; set; }
        public decimal Precio { get; set; }
        public int Stock { get; set; }
        public bool Activo { get; set; }
        public DateTime FechaCreacion { get; set; }
        public ProveedorInfo Proveedor { get; set; } = null!;
        public CategoriaInfo? Categoria { get; set; }
        public TipoProductoInfo? TipoProducto { get; set; }
        public List<ImagenInfo> Imagenes { get; set; } = new List<ImagenInfo>();
    }


    public class CategoriaInfo
    {
        public int CategoriaId { get; set; }
        public string Nombre { get; set; } = string.Empty;
    }

    public class TipoProductoInfo
    {
        public int TipoProductoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
    }

    public class ImagenInfo
    {
        public int ImagenId { get; set; }
        public string Url { get; set; } = string.Empty;
        public int Orden { get; set; }
    }

    public class ProductosPaginadosResponse
    {
        public IEnumerable<ProductoResponse> Productos { get; set; } = new List<ProductoResponse>();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages { get; set; }
    }
}
