using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PagosController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<PagosController> _logger;

        public PagosController(PuntoVentaDbContext context, ILogger<PagosController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("procesar")]
        public async Task<ActionResult<PagoResponse>> ProcesarPago([FromBody] ProcesarPagoRequest request)
        {
            try
            {
                if (request == null)
                {
                    _logger.LogError("Request es null");
                    return BadRequest(new { message = "Datos de pago requeridos" });
                }

                _logger.LogInformation("Procesando pago para orden {OrdenId}", request?.OrdenId);
                _logger.LogInformation("Datos recibidos: OrdenId={OrdenId}, NumeroTarjeta={NumeroTarjeta}, CVV={CVV}", 
                    request?.OrdenId, request?.NumeroTarjeta, request?.CVV);
                // Verificar que la orden existe
                var orden = await _context.Ordenes.FindAsync(request.OrdenId);
                if (orden == null)
                {
                    _logger.LogWarning("Orden {OrdenId} no encontrada", request.OrdenId);
                    return NotFound(new { message = "Orden no encontrada" });
                }

                _logger.LogInformation("Orden encontrada: Estado={Estado}, Total={Total}", orden.EstadoOrden, orden.Total);

                if (orden.EstadoOrden == "Pagado")
                {
                    _logger.LogWarning("Orden {OrdenId} ya está pagada", request.OrdenId);
                    return BadRequest(new { message = "La orden ya está pagada" });
                }

                // Validar datos de tarjeta (simulación)
                if (!ValidarTarjeta(request.NumeroTarjeta, request.CVV))
                {
                    _logger.LogWarning("Datos de tarjeta inválidos para orden {OrdenId}", request.OrdenId);
                    return BadRequest(new { message = "Datos de tarjeta inválidos" });
                }

                // Crear pago
                var pago = new Pago
                {
                    OrdenId = request.OrdenId,
                    MetodoPago = "Tarjeta de Crédito",
                    Monto = orden.Total,
                    Estado = "Procesando",
                    FechaCreacion = DateTime.UtcNow
                };

                _context.Pagos.Add(pago);
                await _context.SaveChangesAsync();

                // Simular procesamiento de pago
                await Task.Delay(2000); // Simular tiempo de procesamiento

                // Actualizar estado del pago y orden
                pago.Estado = "Aprobado";
                orden.EstadoOrden = "Pagado";
                orden.FechaPago = DateTime.UtcNow;

                // Reducir stock de productos
                var itemsOrden = await _context.ItemsOrden
                    .Include(i => i.Producto)
                    .Where(i => i.OrdenId == request.OrdenId)
                    .ToListAsync();

                foreach (var item in itemsOrden)
                {
                    item.Producto.Stock -= item.Cantidad;
                }

                await _context.SaveChangesAsync();

                var response = new PagoResponse
                {
                    PagoId = pago.PagoId,
                    OrdenId = pago.OrdenId,
                    MetodoPago = pago.MetodoPago,
                    Monto = pago.Monto,
                    Estado = pago.Estado,
                    FechaCreacion = pago.FechaCreacion
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al procesar pago");
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("orden/{ordenId}")]
        public async Task<ActionResult<IEnumerable<PagoResponse>>> GetPagosOrden(int ordenId)
        {
            try
            {
                var pagos = await _context.Pagos
                    .Where(p => p.OrdenId == ordenId)
                    .OrderByDescending(p => p.FechaCreacion)
                    .ToListAsync();

                var response = pagos.Select(p => new PagoResponse
                {
                    PagoId = p.PagoId,
                    OrdenId = p.OrdenId,
                    MetodoPago = p.MetodoPago,
                    Monto = p.Monto,
                    Estado = p.Estado,
                    FechaCreacion = p.FechaCreacion
                });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener pagos de la orden {OrdenId}", ordenId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<PagoResponse>> GetPago(int id)
        {
            try
            {
                var pago = await _context.Pagos
                    .Include(p => p.Orden)
                    .FirstOrDefaultAsync(p => p.PagoId == id);

                if (pago == null)
                {
                    return NotFound();
                }

                var response = new PagoResponse
                {
                    PagoId = pago.PagoId,
                    OrdenId = pago.OrdenId,
                    MetodoPago = pago.MetodoPago,
                    Monto = pago.Monto,
                    Estado = pago.Estado,
                    FechaCreacion = pago.FechaCreacion
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener pago {PagoId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        private bool ValidarTarjeta(string numeroTarjeta, string cvv)
        {
            _logger.LogInformation("Validando tarjeta: NumeroTarjeta='{NumeroTarjeta}', CVV='{CVV}'", numeroTarjeta, cvv);
            
            // Validación básica de tarjeta (simulación)
            if (string.IsNullOrEmpty(numeroTarjeta) || string.IsNullOrEmpty(cvv))
            {
                _logger.LogWarning("Tarjeta o CVV vacío");
                return false;
            }

            // Remover espacios y guiones
            numeroTarjeta = numeroTarjeta.Replace(" ", "").Replace("-", "");

            // Verificar que solo contenga dígitos
            if (!numeroTarjeta.All(char.IsDigit) || !cvv.All(char.IsDigit))
            {
                _logger.LogWarning("Tarjeta o CVV contiene caracteres no numéricos");
                return false;
            }

            // Verificar longitud
            if (numeroTarjeta.Length < 13 || numeroTarjeta.Length > 19)
            {
                _logger.LogWarning("Longitud de tarjeta inválida: {Length}", numeroTarjeta.Length);
                return false;
            }

            if (cvv.Length < 3 || cvv.Length > 4)
            {
                _logger.LogWarning("Longitud de CVV inválida: {Length}", cvv.Length);
                return false;
            }

            // Algoritmo de Luhn para validar número de tarjeta
            bool luhnValid = ValidarLuhn(numeroTarjeta);
            _logger.LogInformation("Validación Luhn: {LuhnValid}", luhnValid);
            return luhnValid;
        }

        private bool ValidarLuhn(string numero)
        {
            int suma = 0;
            bool alternar = false;

            // Procesar dígitos de derecha a izquierda
            for (int i = numero.Length - 1; i >= 0; i--)
            {
                int digito = int.Parse(numero[i].ToString());

                if (alternar)
                {
                    digito *= 2;
                    if (digito > 9)
                    {
                        digito = (digito % 10) + 1;
                    }
                }

                suma += digito;
                alternar = !alternar;
            }

            return (suma % 10) == 0;
        }
    }

    // DTOs
    public class ProcesarPagoRequest
    {
        public int OrdenId { get; set; }
        public string NumeroTarjeta { get; set; } = string.Empty;
        public string CVV { get; set; } = string.Empty;
        public string NombreTitular { get; set; } = string.Empty;
        public string FechaVencimiento { get; set; } = string.Empty;
    }

    public class PagoResponse
    {
        public int PagoId { get; set; }
        public int OrdenId { get; set; }
        public string MetodoPago { get; set; } = string.Empty;
        public decimal Monto { get; set; }
        public string Estado { get; set; } = string.Empty;
        public DateTime FechaCreacion { get; set; }
    }
}

