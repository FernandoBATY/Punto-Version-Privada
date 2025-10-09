using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;
using PuntoVenta.Services;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PagosController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<PagosController> _logger;
        private readonly IEmailService _emailService;

        public PagosController(
            PuntoVentaDbContext context,
            ILogger<PagosController> logger,
            IEmailService emailService)
        {
            _context = context;
            _logger = logger;
            _emailService = emailService;
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

                // Verificar que la orden existe y cargar relaciones necesarias
                var orden = await _context.Ordenes
                    .Include(o => o.Cliente)
                    .Include(o => o.Proveedor)
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Producto)
                    .FirstOrDefaultAsync(o => o.OrdenId == request.OrdenId);

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

                // ============================================
                // GENERAR Y ENVIAR FACTURA AUTOMÁTICAMENTE
                // ============================================
                try
                {
                    _logger.LogInformation("Generando factura automáticamente para orden {OrdenId}", request.OrdenId);

                    // Verificar si ya existe factura
                    var facturaExistente = await _context.Facturas
                        .FirstOrDefaultAsync(f => f.OrdenId == request.OrdenId);

                    Factura factura;

                    if (facturaExistente == null)
                    {
                        // Generar nueva factura
                        var numeroFactura = await GenerarNumeroFactura();
                        var uuid = Guid.NewGuid().ToString();

                        factura = new Factura
                        {
                            OrdenId = request.OrdenId,
                            NumeroFactura = numeroFactura,
                            UUID = uuid,
                            Total = orden.Total,
                            FechaEmision = DateTime.UtcNow,
                            Serie = "A",
                            Folio = await ObtenerSiguienteFolio(),
                            LugarExpedicion = "12345",
                            MetodoPago = "PUE",
                            FormaPago = "03"
                        };

                        _context.Facturas.Add(factura);
                        await _context.SaveChangesAsync();

                        // Crear items de factura
                        var itemsFactura = orden.Items.Select(i => new ItemFactura
                        {
                            FacturaId = factura.FacturaId,
                            ProductoId = i.ProductoId,
                            Cantidad = i.Cantidad,
                            PrecioUnitario = i.PrecioUnitario
                        }).ToList();

                        _context.ItemsFactura.AddRange(itemsFactura);

                        // Generar XML
                        var xmlFactura = GenerarXMLFactura(factura, orden, itemsFactura);
                        factura.FacturaXML = xmlFactura;
                        factura.FechaTimbrado = DateTime.UtcNow;

                        await _context.SaveChangesAsync();

                        _logger.LogInformation("Factura {FacturaId} generada exitosamente", factura.FacturaId);
                    }
                    else
                    {
                        factura = facturaExistente;
                        _logger.LogInformation("Usando factura existente {FacturaId}", factura.FacturaId);
                    }

                    // Recargar la factura con todas sus relaciones para generar el PDF
                    factura = await _context.Facturas
                        .Include(f => f.Orden)
                            .ThenInclude(o => o.Cliente)
                        .Include(f => f.Orden)
                            .ThenInclude(o => o.Proveedor)
                        .Include(f => f.Items)
                            .ThenInclude(i => i.Producto)
                        .FirstOrDefaultAsync(f => f.FacturaId == factura.FacturaId);

                    if (factura != null)
                    {
                        // Generar PDF
                        var pdfBytes = GenerarPDF(factura);
                        _logger.LogInformation("PDF generado, tamaño: {Size} bytes", pdfBytes.Length);

                        // Enviar email con la factura
                        var nombreCliente = $"{orden.Cliente.Nombre} {orden.Cliente.Apellido}";
                        var emailEnviado = await _emailService.SendFacturaEmailAsync(
                            orden.Cliente.Correo,
                            nombreCliente,
                            pdfBytes,
                            factura.NumeroFactura,
                            factura.UUID
                        );

                        if (emailEnviado)
                        {
                            _logger.LogInformation("Factura enviada exitosamente al correo {Correo}", orden.Cliente.Correo);
                        }
                        else
                        {
                            _logger.LogWarning("No se pudo enviar la factura al correo {Correo}", orden.Cliente.Correo);
                        }
                    }
                }
                catch (Exception exFactura)
                {
                    // No fallar el pago si hay error al generar/enviar factura
                    _logger.LogError(exFactura, "Error al generar/enviar factura automáticamente para orden {OrdenId}", request.OrdenId);
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

        // Métodos auxiliares para generar factura
        private async Task<string> GenerarNumeroFactura()
        {
            var ultimaFactura = await _context.Facturas
                .OrderByDescending(f => f.FacturaId)
                .FirstOrDefaultAsync();

            var numero = ultimaFactura != null ? ultimaFactura.FacturaId + 1 : 1;
            return $"FACT-{numero:D6}";
        }

        private async Task<int> ObtenerSiguienteFolio()
        {
            var ultimoFolio = await _context.Facturas
                .OrderByDescending(f => f.Folio)
                .Select(f => f.Folio)
                .FirstOrDefaultAsync();

            return ultimoFolio + 1;
        }

        private string GenerarXMLFactura(Factura factura, Orden orden, List<ItemFactura> items)
        {
            return $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<cfdi:Comprobante xmlns:cfdi=""http://www.sat.gob.mx/cfd/3"" 
                  Version=""3.3""
                  Serie=""{factura.Serie}""
                  Folio=""{factura.Folio}""
                  Fecha=""{factura.FechaEmision:yyyy-MM-ddTHH:mm:ss}""
                  UUID=""{factura.UUID}"">
</cfdi:Comprobante>";
        }

        private byte[] GenerarPDF(Factura factura)
        {
            QuestPDF.Settings.License = LicenseType.Community;

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(PageSizes.A4);
                    page.Margin(1.5f, Unit.Centimetre);
                    page.DefaultTextStyle(x => x.FontSize(11).FontColor("#000000"));
                    page.Background("#f5f5f5");

                    page.Content()
                        .PaddingVertical(0.5f, Unit.Centimetre)
                        .Background("#ffffff")
                        .Padding(20)
                        .Column(column =>
                        {
                            column.Spacing(15);

                            // ============ HEADER ============
                            column.Item().Row(row =>
                            {
                                // Columna izquierda: datos del emisor (SIN LOGO)
                                row.RelativeItem().Column(col =>
                                {
                                    col.Item().Column(info =>
                                    {
                                        info.Item().Text($"{factura.Orden.Proveedor.Nombre} {factura.Orden.Proveedor.Apellido}".ToUpper())
                                            .SemiBold().FontSize(13).FontColor("#000000");
                                        info.Item().Text("Domicilio Conocido S/N, San Diego Alcalá").FontSize(10).FontColor("#666666");
                                        info.Item().Text($"C.P. {factura.LugarExpedicion}, 50850 Temoaya, Méx.").FontSize(10).FontColor("#666666");
                                        info.Item().Text($"Tel: {factura.Orden.Proveedor.Telefono ?? "(55) 5555-1234"}").FontSize(10).FontColor("#666666");
                                    });
                                });

                                // Columna derecha: Título y datos fiscales
                                row.RelativeItem().Column(col =>
                                {
                                    col.Item().AlignRight().Text("FACTURA ELECTRÓNICA")
                                        .SemiBold().FontSize(24).FontColor("#8b0000");

                                    col.Item().PaddingTop(15).Column(info =>
                                    {
                                        info.Item().Row(r =>
                                        {
                                            r.RelativeItem().Text("Folio Fiscal:").FontSize(11).FontColor("#666666");
                                        });
                                        info.Item().Text(factura.UUID).FontSize(9).FontColor("#000000");

                                        info.Item().PaddingTop(8).Row(r =>
                                        {
                                            r.AutoItem().Column(c =>
                                            {
                                                c.Item().Text("Serie y Folio:").FontSize(11).FontColor("#666666");
                                                c.Item().Text($"{factura.Serie}-{factura.Folio}").FontSize(18).SemiBold().FontColor("#000000");
                                            });
                                        });

                                        info.Item().PaddingTop(8).Column(c =>
                                        {
                                            c.Item().Text("Fecha de Emisión:").FontSize(11).FontColor("#666666");
                                            c.Item().Text(factura.FechaEmision.ToString("dd/MM/yyyy hh:mm:ss tt")).FontSize(13).FontColor("#000000");
                                        });

                                        info.Item().PaddingTop(5).Column(c =>
                                        {
                                            c.Item().Text("Lugar de Expedición:").FontSize(11).FontColor("#666666");
                                            c.Item().Text(factura.LugarExpedicion).FontSize(13).FontColor("#000000");
                                        });
                                    });
                                });
                            });

                            // Línea separadora gruesa
                            column.Item().PaddingTop(10).Height(3).Background("#8b0000");

                            // ============ DATOS DEL EMISOR ============
                            column.Item().PaddingTop(15).Column(col =>
                            {
                                col.Item().Background("#8b0000").Padding(8).Text("DATOS DEL EMISOR")
                                    .SemiBold().FontSize(12).FontColor("#ffffff");

                                col.Item().Background("#f9f9f9").Padding(12).Row(row =>
                                {
                                    row.RelativeItem().Column(c =>
                                    {
                                        c.Item().Text("RFC EMISOR:").FontSize(11).FontColor("#666666");
                                        c.Item().Text(factura.Orden.Proveedor.RFC ?? "XXXX000000XXX").FontSize(13).FontColor("#000000");
                                    });

                                    row.RelativeItem().Column(c =>
                                    {
                                        c.Item().Text("RÉGIMEN FISCAL:").FontSize(11).FontColor("#666666");
                                        c.Item().Text("601 - General de Ley Personas Morales").FontSize(13).FontColor("#000000");
                                    });
                                });
                            });

                            // ============ DATOS DEL RECEPTOR ============
                            column.Item().PaddingTop(10).Column(col =>
                            {
                                col.Item().Background("#8b0000").Padding(8).Text("DATOS DEL RECEPTOR")
                                    .SemiBold().FontSize(12).FontColor("#ffffff");

                                col.Item().Background("#f9f9f9").Padding(12).Column(content =>
                                {
                                    content.Item().Row(row =>
                                    {
                                        row.RelativeItem().Column(c =>
                                        {
                                            c.Item().Text("NOMBRE / RAZÓN SOCIAL:").FontSize(11).FontColor("#666666");
                                            c.Item().Text($"{factura.Orden.Cliente.Nombre} {factura.Orden.Cliente.Apellido}".ToUpper())
                                                .FontSize(13).FontColor("#000000");
                                        });

                                        row.RelativeItem().Column(c =>
                                        {
                                            c.Item().Text("RFC RECEPTOR:").FontSize(11).FontColor("#666666");
                                            c.Item().Text(factura.Orden.Cliente.RFC ?? "XAXX010101000").FontSize(13).FontColor("#000000");
                                        });
                                    });

                                    content.Item().PaddingTop(8).Row(row =>
                                    {
                                        row.RelativeItem().Column(c =>
                                        {
                                            c.Item().Text("DOMICILIO FISCAL:").FontSize(11).FontColor("#666666");
                                            c.Item().Text("Domicilio Conocido S/N, San Diego Alcalá, 50850 Temoaya, Méx.")
                                                .FontSize(11).FontColor("#000000");
                                        });

                                        row.RelativeItem().Column(c =>
                                        {
                                            c.Item().Text("RÉGIMEN FISCAL:").FontSize(11).FontColor("#666666");
                                            c.Item().Text($"{factura.Orden.Cliente.RegimenFiscal}").FontSize(13).FontColor("#000000");
                                        });
                                    });

                                    content.Item().PaddingTop(8).Column(c =>
                                    {
                                        c.Item().Text("USO DE CFDI:").FontSize(11).FontColor("#666666");
                                        c.Item().Text("G03 - Gastos en general").FontSize(13).FontColor("#000000");
                                    });
                                });
                            });

                            // ============ CONCEPTOS (TABLA) ============
                            column.Item().PaddingTop(15).Column(col =>
                            {
                                col.Item().Background("#8b0000").Padding(8).Text("CONCEPTOS")
                                    .SemiBold().FontSize(12).FontColor("#ffffff");

                                col.Item().Table(table =>
                                {
                                    table.ColumnsDefinition(columns =>
                                    {
                                        columns.RelativeColumn(1);      // Cantidad
                                        columns.RelativeColumn(2);      // Clave Prod/Serv
                                        columns.RelativeColumn(4);      // Descripción
                                        columns.RelativeColumn(1.5f);   // Valor Unitario
                                        columns.RelativeColumn(1.5f);   // Importe
                                    });

                                    table.Header(header =>
                                    {
                                        header.Cell().Element(HeaderStyle).Text("Cantidad");
                                        header.Cell().Element(HeaderStyle).Text("Clave Prod/Serv");
                                        header.Cell().Element(HeaderStyle).Text("Descripción");
                                        header.Cell().Element(HeaderStyle).AlignRight().Text("Valor Unitario");
                                        header.Cell().Element(HeaderStyle).AlignRight().Text("Importe");

                                        IContainer HeaderStyle(IContainer container)
                                        {
                                            return container
                                                .Border(1).BorderColor("#dddddd")
                                                .Background("#f0f0f0")
                                                .Padding(8)
                                                .DefaultTextStyle(x => x.SemiBold().FontSize(12));
                                        }
                                    });

                                    foreach (var item in factura.Items)
                                    {
                                        table.Cell().Element(CellStyle).Text(item.Cantidad.ToString("F2"));
                                        table.Cell().Element(CellStyle).Text("43211500");
                                        table.Cell().Element(CellStyle).Text(item.Producto?.Nombre ?? "Producto");
                                        table.Cell().Element(CellStyle).AlignRight().Text($"${item.PrecioUnitario:N2}");
                                        table.Cell().Element(CellStyle).AlignRight().Text($"${item.Subtotal:N2}");

                                        IContainer CellStyle(IContainer container)
                                        {
                                            return container
                                                .Border(1).BorderColor("#dddddd")
                                                .Padding(8)
                                                .DefaultTextStyle(x => x.FontSize(12));
                                        }
                                    }
                                });
                            });

                            // ============ TOTALES ============
                            column.Item().PaddingTop(15).AlignRight().Width(200).Column(col =>
                            {
                                col.Item().Border(1).BorderColor("#dddddd").Row(row =>
                                {
                                    row.RelativeItem().Padding(8).Text("Subtotal:").SemiBold().FontSize(13);
                                    row.RelativeItem().Padding(8).AlignRight().Text($"${factura.Total:N2}").FontSize(13);
                                });

                                col.Item().Border(1).BorderColor("#dddddd").Row(row =>
                                {
                                    row.RelativeItem().Padding(8).Text("IVA (16%):").SemiBold().FontSize(13);
                                    row.RelativeItem().Padding(8).AlignRight().Text($"${(factura.Total * 0.16m):N2}").FontSize(13);
                                });

                                col.Item().Background("#8b0000").Row(row =>
                                {
                                    row.RelativeItem().Padding(8).Text("TOTAL:").SemiBold().FontSize(16).FontColor("#ffffff");
                                    row.RelativeItem().Padding(8).AlignRight().Text($"${(factura.Total * 1.16m):N2}")
                                        .SemiBold().FontSize(16).FontColor("#ffffff");
                                });
                            });

                            // ============ INFORMACIÓN FISCAL ADICIONAL ============
                            column.Item().PaddingTop(15).Column(col =>
                            {
                                col.Item().Background("#8b0000").Padding(8).Text("INFORMACIÓN FISCAL ADICIONAL")
                                    .SemiBold().FontSize(12).FontColor("#ffffff");

                                col.Item().Background("#f9f9f9").Padding(12).Row(row =>
                                {
                                    row.RelativeItem().Column(c =>
                                    {
                                        c.Item().Text("FORMA DE PAGO:").FontSize(11).FontColor("#666666");
                                        c.Item().Text($"{factura.FormaPago} - Transferencia electrónica de fondos").FontSize(12).FontColor("#000000");
                                    });

                                    row.RelativeItem().Column(c =>
                                    {
                                        c.Item().Text("MÉTODO DE PAGO:").FontSize(11).FontColor("#666666");
                                        c.Item().Text($"{factura.MetodoPago} - Pago en una sola exhibición").FontSize(12).FontColor("#000000");
                                    });
                                });

                                col.Item().PaddingTop(8).Background("#f9f9f9").Padding(12).Row(row =>
                                {
                                    row.RelativeItem().Column(c =>
                                    {
                                        c.Item().Text("MONEDA:").FontSize(11).FontColor("#666666");
                                        c.Item().Text("MXN - Peso Mexicano").FontSize(12).FontColor("#000000");
                                    });

                                    row.RelativeItem().Column(c =>
                                    {
                                        c.Item().Text("TIPO DE COMPROBANTE:").FontSize(11).FontColor("#666666");
                                        c.Item().Text("I - Ingreso").FontSize(12).FontColor("#000000");
                                    });
                                });
                            });

                            // ============ SELLOS DIGITALES ============
                            column.Item().PaddingTop(15).Column(col =>
                            {
                                // Certificados
                                col.Item().Row(row =>
                                {
                                    row.RelativeItem().Column(c =>
                                    {
                                        c.Item().Text("CERTIFICADO DIGITAL DEL EMISOR:").FontSize(11).FontColor("#666666");
                                        c.Item().Background("#f9f9f9").Padding(5).Text("00001000000514563217").FontSize(9);
                                    });

                                    row.RelativeItem().Column(c =>
                                    {
                                        c.Item().Text("CERTIFICADO DEL SAT:").FontSize(11).FontColor("#666666");
                                        c.Item().Background("#f9f9f9").Padding(5).Text("00001000000509867354").FontSize(9);
                                    });
                                });

                                // Sello CFDI
                                col.Item().PaddingTop(8).Column(c =>
                                {
                                    c.Item().Text("SELLO DIGITAL DEL CFDI:").FontSize(11).FontColor("#666666");
                                    c.Item().Background("#f9f9f9").Padding(5).Text(
                                        "fJ8K3mN9pQ2rS7tU1vW5xY0zA4bC8dE6fG9hI2jK5lM8nO1pQ4rS7tU0vW3xY6zA9bC2dE5fG8hI1jK4lM7nO0pQ3rS6tU9vW2xY5zA8bC1dE4fG7hI0jK3lM6nO9pQ2rS5tU8vW1xY4zA7bC0dE3fG6hI9jK2lM5nO8pQ1rS4tU7vW0xY3zA6bC9dE2fG5hI8jK1lM4nO7pQ0rS3tU6vW9xY2zA5bC8dE1fG4hI7jK0lM3nO6pQ9rS2tU5vW8xY1zA4bC7dE0fG3hI6jK9lM2nO5pQ8rS1tU4vW7xY0zA3bC6dE9fG2hI5jK8lM1nO4pQ7rS0tU3vW6xY9zA2bC5dE8fG1hI4jK7lM0nO3pQ6rS9tU2vW5xY8zA1bC4dE7fG0hI3jK6lM9nO2pQ5rS8tU1vW4xY7zA0bC3dE6fG9hI2jK5lM8nO1pQ4rS7tU0vW3xY6zA="
                                    ).FontSize(9);
                                });

                                // Sello SAT
                                col.Item().PaddingTop(8).Column(c =>
                                {
                                    c.Item().Text("SELLO DIGITAL DEL SAT:").FontSize(11).FontColor("#666666");
                                    c.Item().Background("#f9f9f9").Padding(5).Text(
                                        "kL9M0nP3qR6sT9uV2wX5yZ8aB1cD4eF7gH0iJ3kL6mN9oP2qR5sT8uV1wX4yZ7aB0cD3eF6gH9iJ2kL5mN8oP1qR4sT7uV0wX3yZ6aB9cD2eF5gH8iJ1kL4mN7oP0qR3sT6uV9wX2yZ5aB8cD1eF4gH7iJ0kL3mN6oP9qR2sT5uV8wX1yZ4aB7cD0eF3gH6iJ9kL2mN5oP8qR1sT4uV7wX0yZ3aB6cD9eF2gH5iJ8kL1mN4oP7qR0sT3uV6wX9yZ2aB5cD8eF1gH4iJ7kL0mN3oP6qR9sT2uV5wX8yZ1aB4cD7eF0gH3iJ6kL9mN2oP5qR8sT1uV4wX7yZ0aB3cD6eF9gH2iJ5kL8mN1oP4qR7sT0uV3wX6yZ9aB2cD5eF8gH1iJ4kL7mN0oP3qR6sT9uV2wX5yZ8aB1cD4eF7gH0iJ3kL6mN9oP2=="
                                    ).FontSize(9);
                                });

                                // Cadena Original
                                col.Item().PaddingTop(8).Column(c =>
                                {
                                    c.Item().Text("CADENA ORIGINAL DEL COMPLEMENTO DE CERTIFICACIÓN DIGITAL DEL SAT:").FontSize(11).FontColor("#666666");
                                    c.Item().Background("#f9f9f9").Padding(5).Text(
                                        $"||4.0|{factura.UUID}|{factura.FechaEmision:yyyy-MM-ddTHH:mm:ss}|{factura.Orden.Proveedor.RFC}|{factura.Total:F2}|{(factura.Total * 1.16m):F2}|00001000000514563217|00001000000509867354||"
                                    ).FontSize(9);
                                });
                            });
                        });
                });
            });

            return document.GeneratePdf();
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
}