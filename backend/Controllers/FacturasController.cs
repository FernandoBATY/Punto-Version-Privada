using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FacturasController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<FacturasController> _logger;

        public FacturasController(PuntoVentaDbContext context, ILogger<FacturasController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost("generar/{ordenId}")]
        public async Task<ActionResult<FacturaResponse>> GenerarFactura(int ordenId)
        {
            try
            {
                // Verificar que la orden existe y está pagada
                var orden = await _context.Ordenes
                    .Include(o => o.Cliente)
                    .Include(o => o.Proveedor)
                    .Include(o => o.Items)
                        .ThenInclude(i => i.Producto)
                    .FirstOrDefaultAsync(o => o.OrdenId == ordenId);

                if (orden == null)
                {
                    return NotFound(new { message = "Orden no encontrada" });
                }

                if (orden.EstadoOrden != "Pagado")
                {
                    return BadRequest(new { message = "La orden debe estar pagada para generar factura" });
                }

                // Verificar si ya existe factura para esta orden
                var facturaExistente = await _context.Facturas
                    .FirstOrDefaultAsync(f => f.OrdenId == ordenId);

                if (facturaExistente != null)
                {
                    return BadRequest(new { message = "Ya existe una factura para esta orden" });
                }

                // Generar número de factura y UUID
                var numeroFactura = await GenerarNumeroFactura();
                var uuid = Guid.NewGuid().ToString();

                // Crear factura
                var factura = new Factura
                {
                    OrdenId = ordenId,
                    NumeroFactura = numeroFactura,
                    UUID = uuid,
                    Total = orden.Total,
                    FechaEmision = DateTime.UtcNow,
                    Serie = "A",
                    Folio = await ObtenerSiguienteFolio(),
                    LugarExpedicion = "12345", // Código postal del lugar de expedición
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
                await _context.SaveChangesAsync();

                // Generar XML de factura (simulación)
                var xmlFactura = GenerarXMLFactura(factura, orden, itemsFactura);
                factura.FacturaXML = xmlFactura;
                factura.FechaTimbrado = DateTime.UtcNow;

                await _context.SaveChangesAsync();

                var response = new FacturaResponse
                {
                    FacturaId = factura.FacturaId,
                    OrdenId = factura.OrdenId,
                    NumeroFactura = factura.NumeroFactura,
                    UUID = factura.UUID,
                    Total = factura.Total,
                    FechaEmision = factura.FechaEmision,
                    FechaTimbrado = factura.FechaTimbrado,
                    Serie = factura.Serie,
                    Folio = factura.Folio,
                    LugarExpedicion = factura.LugarExpedicion,
                    MetodoPago = factura.MetodoPago,
                    FormaPago = factura.FormaPago,
                    Cliente = new ClienteFacturaInfo
                    {
                        Nombre = orden.Cliente.Nombre,
                        Apellido = orden.Cliente.Apellido,
                        RFC = orden.Cliente.RFC,
                        RegimenFiscal = orden.Cliente.RegimenFiscal
                    },
                    Proveedor = new ProveedorFacturaInfo
                    {
                        Nombre = orden.Proveedor.Nombre,
                        Apellido = orden.Proveedor.Apellido,
                        RFC = orden.Proveedor.RFC
                    },
                    Items = itemsFactura.Select(i => new ItemFacturaResponse
                    {
                        ProductoId = i.ProductoId,
                        Cantidad = i.Cantidad,
                        PrecioUnitario = i.PrecioUnitario,
                        Subtotal = i.Subtotal
                    }).ToList()
                };

                return CreatedAtAction(nameof(GetFactura), new { id = factura.FacturaId }, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al generar factura para orden {OrdenId}", ordenId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<FacturaResponse>> GetFactura(int id)
        {
            try
            {
                var factura = await _context.Facturas
                    .Include(f => f.Orden)
                        .ThenInclude(o => o.Cliente)
                    .Include(f => f.Orden)
                        .ThenInclude(o => o.Proveedor)
                    .Include(f => f.Items)
                        .ThenInclude(i => i.Producto)
                    .FirstOrDefaultAsync(f => f.FacturaId == id);

                if (factura == null)
                {
                    return NotFound();
                }

                var response = new FacturaResponse
                {
                    FacturaId = factura.FacturaId,
                    OrdenId = factura.OrdenId,
                    NumeroFactura = factura.NumeroFactura,
                    UUID = factura.UUID,
                    Total = factura.Total,
                    FechaEmision = factura.FechaEmision,
                    FechaTimbrado = factura.FechaTimbrado,
                    Serie = factura.Serie,
                    Folio = factura.Folio,
                    LugarExpedicion = factura.LugarExpedicion,
                    MetodoPago = factura.MetodoPago,
                    FormaPago = factura.FormaPago,
                    Cliente = new ClienteFacturaInfo
                    {
                        Nombre = factura.Orden.Cliente.Nombre,
                        Apellido = factura.Orden.Cliente.Apellido,
                        RFC = factura.Orden.Cliente.RFC,
                        RegimenFiscal = factura.Orden.Cliente.RegimenFiscal
                    },
                    Proveedor = new ProveedorFacturaInfo
                    {
                        Nombre = factura.Orden.Proveedor.Nombre,
                        Apellido = factura.Orden.Proveedor.Apellido,
                        RFC = factura.Orden.Proveedor.RFC
                    },
                    Items = factura.Items.Select(i => new ItemFacturaResponse
                    {
                        ProductoId = i.ProductoId,
                        Cantidad = i.Cantidad,
                        PrecioUnitario = i.PrecioUnitario,
                        Subtotal = i.Subtotal
                    }).ToList()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener factura {FacturaId}", id);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("pdf/{facturaId}")]
        public async Task<ActionResult> GenerarPDFFactura(int facturaId)
        {
            try
            {
                var factura = await _context.Facturas
                    .Include(f => f.Orden)
                        .ThenInclude(o => o.Cliente)
                    .Include(f => f.Orden)
                        .ThenInclude(o => o.Proveedor)
                    .Include(f => f.Items)
                        .ThenInclude(i => i.Producto)
                    .FirstOrDefaultAsync(f => f.FacturaId == facturaId);

                if (factura == null)
                {
                    return NotFound(new { message = "Factura no encontrada" });
                }

                var pdfBytes = GenerarPDF(factura);

                return File(pdfBytes, "application/pdf", $"Factura_{factura.NumeroFactura}.pdf");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al generar PDF de factura {FacturaId}", facturaId);
                return StatusCode(500, new { message = $"Error al generar PDF: {ex.Message}" });
            }
        }

        [HttpGet("pdf-orden/{ordenId}")]
        public async Task<ActionResult> GenerarPDFFacturaPorOrden(int ordenId)
        {
            try
            {
                var factura = await _context.Facturas
                    .Include(f => f.Orden)
                        .ThenInclude(o => o.Cliente)
                    .Include(f => f.Orden)
                        .ThenInclude(o => o.Proveedor)
                    .Include(f => f.Items)
                        .ThenInclude(i => i.Producto)
                    .FirstOrDefaultAsync(f => f.OrdenId == ordenId);

                if (factura == null)
                {
                    return NotFound(new { message = "No se encontró factura para esta orden" });
                }

                var pdfBytes = GenerarPDF(factura);

                return File(pdfBytes, "application/pdf", $"Factura_{factura.NumeroFactura}.pdf");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al generar PDF de factura para orden {OrdenId}", ordenId);
                return StatusCode(500, new { message = $"Error al generar PDF: {ex.Message}" });
            }
        }

        [HttpGet("cliente/{clienteId}")]
        public async Task<ActionResult<IEnumerable<FacturaResponse>>> GetFacturasCliente(int clienteId)
        {
            try
            {
                var facturas = await _context.Facturas
                    .Include(f => f.Orden)
                        .ThenInclude(o => o.Cliente)
                    .Include(f => f.Orden)
                        .ThenInclude(o => o.Proveedor)
                    .Where(f => f.Orden.ClienteId == clienteId)
                    .OrderByDescending(f => f.FechaEmision)
                    .ToListAsync();

                var response = facturas.Select(f => new FacturaResponse
                {
                    FacturaId = f.FacturaId,
                    OrdenId = f.OrdenId,
                    NumeroFactura = f.NumeroFactura,
                    UUID = f.UUID,
                    Total = f.Total,
                    FechaEmision = f.FechaEmision,
                    FechaTimbrado = f.FechaTimbrado,
                    Serie = f.Serie,
                    Folio = f.Folio,
                    LugarExpedicion = f.LugarExpedicion,
                    MetodoPago = f.MetodoPago,
                    FormaPago = f.FormaPago,
                    Proveedor = new ProveedorFacturaInfo
                    {
                        Nombre = f.Orden.Proveedor.Nombre,
                        Apellido = f.Orden.Proveedor.Apellido,
                        RFC = f.Orden.Proveedor.RFC
                    }
                });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener facturas del cliente {ClienteId}", clienteId);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

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
            // Simulación de XML de factura
            return $@"<?xml version=""1.0"" encoding=""UTF-8""?>
<cfdi:Comprobante xmlns:cfdi=""http://www.sat.gob.mx/cfd/3"" 
                  xmlns:xsi=""http://www.w3.org/2001/XMLSchema-instance""
                  xsi:schemaLocation=""http://www.sat.gob.mx/cfd/3 http://www.sat.gob.mx/sitio_internet/cfd/3/cfdv33.xsd""
                  Version=""3.3""
                  Serie=""{factura.Serie}""
                  Folio=""{factura.Folio}""
                  Fecha=""{factura.FechaEmision:yyyy-MM-ddTHH:mm:ss}""
                  Sello=""SELLO_SIMULADO""
                  FormaPago=""{factura.FormaPago}""
                  NoCertificado=""CERTIFICADO_SIMULADO""
                  Certificado=""CERTIFICADO_SIMULADO""
                  SubTotal=""{factura.Total}""
                  Moneda=""MXN""
                  Total=""{factura.Total}""
                  TipoDeComprobante=""I""
                  Exportacion=""01""
                  MetodoPago=""{factura.MetodoPago}""
                  LugarExpedicion=""{factura.LugarExpedicion}"">
  <!-- Contenido del XML simplificado -->
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
        public class FacturaResponse
        {
            public int FacturaId { get; set; }
            public int OrdenId { get; set; }
            public string NumeroFactura { get; set; } = string.Empty;
            public string UUID { get; set; } = string.Empty;
            public decimal Total { get; set; }
            public DateTime FechaEmision { get; set; }
            public DateTime? FechaTimbrado { get; set; }
            public string Serie { get; set; } = string.Empty;
            public int Folio { get; set; }
            public string LugarExpedicion { get; set; } = string.Empty;
            public string MetodoPago { get; set; } = string.Empty;
            public string FormaPago { get; set; } = string.Empty;
            public ClienteFacturaInfo? Cliente { get; set; }
            public ProveedorFacturaInfo? Proveedor { get; set; }
            public List<ItemFacturaResponse> Items { get; set; } = new List<ItemFacturaResponse>();
        }

        public class ClienteFacturaInfo
        {
            public string Nombre { get; set; } = string.Empty;
            public string Apellido { get; set; } = string.Empty;
            public string? RFC { get; set; }
            public string RegimenFiscal { get; set; } = string.Empty;
        }

        public class ProveedorFacturaInfo
        {
            public string Nombre { get; set; } = string.Empty;
            public string Apellido { get; set; } = string.Empty;
            public string? RFC { get; set; }
        }

        public class ItemFacturaResponse
        {
            public int ProductoId { get; set; }
            public int Cantidad { get; set; }
            public decimal PrecioUnitario { get; set; }
            public decimal Subtotal { get; set; }
        }
    }
}
