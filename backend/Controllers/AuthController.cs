using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<AuthController> _logger;

        public AuthController(PuntoVentaDbContext context, ILogger<AuthController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("cliente/registro")]
        public async Task<ActionResult<Cliente>> RegistroCliente([FromBody] RegistroClienteRequest request)
        {
            try
            {
                if (await _context.Clientes.AnyAsync(c => c.Correo == request.Correo))
                {
                    return BadRequest(new { message = "El correo ya está registrado" });
                }

                var cliente = new Cliente
                {
                    Correo = request.Correo,
                    Contrasena = HashPassword(request.Contrasena),
                    Nombre = request.Nombre,
                    Apellido = request.Apellido,
                    RFC = request.RFC,
                    Telefono = request.Telefono,
                    RegimenFiscal = request.RegimenFiscal,
                    CodigoPostal = request.CodigoPostal,
                    UsoCFDI = request.UsoCFDI,
                    FechaCreacion = DateTime.UtcNow
                };

                _context.Clientes.Add(cliente);
                await _context.SaveChangesAsync();

                cliente.Contrasena = string.Empty;
                return CreatedAtAction(nameof(GetCliente), new { id = cliente.ClienteId }, cliente);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al registrar cliente");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPost("cliente/login")]
        public async Task<ActionResult<ClienteResponse>> LoginCliente([FromBody] LoginRequest request)
        {
            try
            {
                var cliente = await _context.Clientes
                    .FirstOrDefaultAsync(c => c.Correo == request.Correo);

                if (cliente == null || !VerifyPassword(request.Contrasena, cliente.Contrasena))
                {
                    return Unauthorized(new { message = "Credenciales inválidas" });
                }

                return Ok(new ClienteResponse
                {
                    ClienteId = cliente.ClienteId,
                    Correo = cliente.Correo,
                    Nombre = cliente.Nombre,
                    Apellido = cliente.Apellido,
                    RFC = cliente.RFC,
                    Telefono = cliente.Telefono,
                    RegimenFiscal = cliente.RegimenFiscal,
                    CodigoPostal = cliente.CodigoPostal,
                    UsoCFDI = cliente.UsoCFDI
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al iniciar sesión cliente");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPost("proveedor/registro")]
        public async Task<ActionResult<Proveedor>> RegistroProveedor([FromBody] RegistroProveedorRequest request)
        {
            try
            {
                if (await _context.Proveedores.AnyAsync(p => p.Correo == request.Correo))
                {
                    return BadRequest(new { message = "El correo ya está registrado" });
                }

                var proveedor = new Proveedor
                {
                    Correo = request.Correo,
                    Contrasena = HashPassword(request.Contrasena),
                    Nombre = request.Nombre,
                    Apellido = request.Apellido,
                    RFC = request.RFC,
                    Telefono = request.Telefono,
                    RegimenFiscal = request.RegimenFiscal,
                    CodigoPostal = request.CodigoPostal,
                    FechaCreacion = DateTime.UtcNow
                };

                _context.Proveedores.Add(proveedor);
                await _context.SaveChangesAsync();

                proveedor.Contrasena = string.Empty;
                return CreatedAtAction(nameof(GetProveedor), new { id = proveedor.ProveedorId }, proveedor);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al registrar proveedor");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpPost("proveedor/login")]
        public async Task<ActionResult<ProveedorResponse>> LoginProveedor([FromBody] LoginRequest request)
        {
            try
            {
                var proveedor = await _context.Proveedores
                    .FirstOrDefaultAsync(p => p.Correo == request.Correo);

                if (proveedor == null || !VerifyPassword(request.Contrasena, proveedor.Contrasena))
                {
                    return Unauthorized(new { message = "Credenciales inválidas" });
                }

                return Ok(new ProveedorResponse
                {
                    ProveedorId = proveedor.ProveedorId,
                    Correo = proveedor.Correo,
                    Nombre = proveedor.Nombre,
                    Apellido = proveedor.Apellido,
                    RFC = proveedor.RFC,
                    Telefono = proveedor.Telefono,
                    RegimenFiscal = proveedor.RegimenFiscal,
                    CodigoPostal = proveedor.CodigoPostal
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al iniciar sesión proveedor");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("cliente/{id}")]
        public async Task<ActionResult<ClienteResponse>> GetCliente(int id)
        {
            var cliente = await _context.Clientes.FindAsync(id);
            if (cliente == null)
            {
                return NotFound();
            }

            return Ok(new ClienteResponse
            {
                ClienteId = cliente.ClienteId,
                Correo = cliente.Correo,
                Nombre = cliente.Nombre,
                Apellido = cliente.Apellido,
                RFC = cliente.RFC,
                Telefono = cliente.Telefono,
                RegimenFiscal = cliente.RegimenFiscal,
                CodigoPostal = cliente.CodigoPostal,
                UsoCFDI = cliente.UsoCFDI
            });
        }

        [HttpGet("proveedor/{id}")]
        public async Task<ActionResult<ProveedorResponse>> GetProveedor(int id)
        {
            var proveedor = await _context.Proveedores.FindAsync(id);
            if (proveedor == null)
            {
                return NotFound();
            }

            return Ok(new ProveedorResponse
            {
                ProveedorId = proveedor.ProveedorId,
                Correo = proveedor.Correo,
                Nombre = proveedor.Nombre,
                Apellido = proveedor.Apellido,
                RFC = proveedor.RFC,
                Telefono = proveedor.Telefono,
                RegimenFiscal = proveedor.RegimenFiscal,
                CodigoPostal = proveedor.CodigoPostal
            });
        }

        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }

        private bool VerifyPassword(string password, string hashedPassword)
        {
            return HashPassword(password) == hashedPassword;
        }
    }

    // DTOs para requests y responses
    public class RegistroClienteRequest
    {
        public string Correo { get; set; } = string.Empty;
        public string Contrasena { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string? RFC { get; set; }
        public string? Telefono { get; set; }
        public string RegimenFiscal { get; set; } = string.Empty;
        public string? CodigoPostal { get; set; }
        public string? UsoCFDI { get; set; }
    }

    public class RegistroProveedorRequest
    {
        public string Correo { get; set; } = string.Empty;
        public string Contrasena { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string? RFC { get; set; }
        public string? Telefono { get; set; }
        public string? RegimenFiscal { get; set; }
        public string? CodigoPostal { get; set; }
    }

    public class LoginRequest
    {
        public string Correo { get; set; } = string.Empty;
        public string Contrasena { get; set; } = string.Empty;
    }

    public class ClienteResponse
    {
        public int ClienteId { get; set; }
        public string Correo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string? RFC { get; set; }
        public string? Telefono { get; set; }
        public string RegimenFiscal { get; set; } = string.Empty;
        public string? CodigoPostal { get; set; }
        public string? UsoCFDI { get; set; }
    }

    public class ProveedorResponse
    {
        public int ProveedorId { get; set; }
        public string Correo { get; set; } = string.Empty;
        public string Nombre { get; set; } = string.Empty;
        public string Apellido { get; set; } = string.Empty;
        public string? RFC { get; set; }
        public string? Telefono { get; set; }
        public string? RegimenFiscal { get; set; }
        public string? CodigoPostal { get; set; }
    }
}

