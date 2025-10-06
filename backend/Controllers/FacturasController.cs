using Microsoft.AspNetCore.Mvc;
using PuntoVenta.Data;
using PuntoVenta.Models;
using Microsoft.EntityFrameworkCore;
using DinkToPdf;
using DinkToPdf.Contracts;

namespace PuntoVenta.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FacturasController : ControllerBase
    {
        private readonly PuntoVentaDbContext _context;
        private readonly ILogger<FacturasController> _logger;
        private readonly IConverter _converter;

        public FacturasController(PuntoVentaDbContext context, ILogger<FacturasController> logger, IConverter converter)
        {
            _context = context;
            _logger = logger;
            _converter = converter;
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

                // Generar PDF usando HTML simple
                var htmlContent = GenerarHTMLFactura(factura);
                var pdfBytes = GenerarPDF(htmlContent);

                return File(pdfBytes, "application/pdf", $"Factura_{factura.NumeroFactura}.pdf");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al generar PDF de factura {FacturaId}", facturaId);
                return StatusCode(500, new { message = "Error interno del servidor" });
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

                // Generar PDF usando HTML simple
                var htmlContent = GenerarHTMLFactura(factura);
                var pdfBytes = GenerarPDF(htmlContent);

                return File(pdfBytes, "application/pdf", $"Factura_{factura.NumeroFactura}.pdf");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al generar PDF de factura para orden {OrdenId}", ordenId);
                return StatusCode(500, new { message = "Error interno del servidor" });
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

        private string GenerarHTMLFactura(Factura factura)
        {
            var orden = factura.Orden;
            var cliente = orden.Cliente;
            var proveedor = orden.Proveedor;
            var items = factura.Items;

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <title>Factura {factura.NumeroFactura}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .company-info {{ margin-bottom: 20px; }}
        .invoice-details {{ margin-bottom: 20px; }}
        .client-info {{ margin-bottom: 20px; }}
        table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .total {{ text-align: right; font-weight: bold; }}
        .footer {{ margin-top: 30px; text-align: center; font-size: 12px; color: #666; }}
    </style>
</head>
<body>
    <div class=""header"">
        <h1>FACTURA</h1>
        <h2>{factura.NumeroFactura}</h2>
    </div>

    <div class=""company-info"">
        <h3>Datos del Proveedor</h3>
        <p><strong>Nombre:</strong> {proveedor.Nombre} {proveedor.Apellido}</p>
        <p><strong>RFC:</strong> {proveedor.RFC ?? "N/A"}</p>
        <p><strong>Teléfono:</strong> {proveedor.Telefono ?? "N/A"}</p>
    </div>

    <div class=""client-info"">
        <h3>Datos del Cliente</h3>
        <p><strong>Nombre:</strong> {cliente.Nombre} {cliente.Apellido}</p>
        <p><strong>RFC:</strong> {cliente.RFC ?? "N/A"}</p>
        <p><strong>Email:</strong> {cliente.Correo}</p>
    </div>

    <div class=""invoice-details"">
        <h3>Detalles de la Factura</h3>
        <p><strong>Fecha de Emisión:</strong> {factura.FechaEmision:dd/MM/yyyy HH:mm}</p>
        <p><strong>Serie:</strong> {factura.Serie}</p>
        <p><strong>Folio:</strong> {factura.Folio}</p>
        <p><strong>UUID:</strong> {factura.UUID}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Subtotal</th>
            </tr>
        </thead>
        <tbody>
            {string.Join("", items.Select(item => $@"
            <tr>
                <td>{item.Producto?.Nombre ?? "Producto"}</td>
                <td>{item.Cantidad}</td>
                <td>${item.PrecioUnitario:F2}</td>
                <td>${item.Subtotal:F2}</td>
            </tr>"))}
        </tbody>
        <tfoot>
            <tr class=""total"">
                <td colspan=""3""><strong>TOTAL</strong></td>
                <td><strong>${factura.Total:F2}</strong></td>
            </tr>
        </tfoot>
    </table>

    <div class=""footer"">
        <p>Esta factura fue generada electrónicamente</p>
        <p>Fecha de timbrado: {factura.FechaTimbrado?.ToString("dd/MM/yyyy HH:mm") ?? "Pendiente"}</p>
    </div>
</body>
</html>";
        }

        private byte[] GenerarPDF(string htmlContent)
        {
            try
            {
                var globalSettings = new GlobalSettings
                {
                    ColorMode = ColorMode.Color,
                    Orientation = Orientation.Portrait,
                    PaperSize = PaperKind.A4,
                    Margins = new MarginSettings { Top = 10, Bottom = 10, Left = 10, Right = 10 },
                    DocumentTitle = "Factura"
                };

                var objectSettings = new ObjectSettings
                {
                    PagesCount = true,
                    HtmlContent = htmlContent,
                    WebSettings = { DefaultEncoding = "utf-8" },
                    HeaderSettings = { FontSize = 9, Right = "Página [page] de [toPage]", Line = true },
                    FooterSettings = { FontSize = 9, Center = "Factura generada electrónicamente", Line = true }
                };

                var pdf = new HtmlToPdfDocument()
                {
                    GlobalSettings = globalSettings,
                    Objects = { objectSettings }
                };

                return _converter.Convert(pdf);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al generar PDF");
                
                // Fallback: generar un PDF básico
                var pdfContent = $@"
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length {htmlContent.Length}
>>
stream
BT
/F1 12 Tf
72 720 Td
(Factura generada) Tj
0 -20 Td
(Contenido: {htmlContent.Substring(0, Math.Min(100, htmlContent.Length))}...) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
{htmlContent.Length + 200}
%%EOF";

                return System.Text.Encoding.UTF8.GetBytes(pdfContent);
            }
        }
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

