using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Options;

namespace PuntoVenta.Services
{
    public class EmailSettings
    {
        public string SenderEmail { get; set; } = string.Empty;
        public string SenderName { get; set; } = string.Empty;
        public string SmtpServer { get; set; } = string.Empty;
        public int SmtpPort { get; set; }
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class EmailAttachment
    {
        public byte[] Content { get; set; } = Array.Empty<byte>();
        public string FileName { get; set; } = string.Empty;
        public string MediaType { get; set; } = "application/pdf";
    }

    public interface IEmailService
    {
        Task<bool> SendFacturaEmailAsync(string destinatario, string nombreCliente, byte[] pdfFactura, string numeroFactura, string uuid);
        Task<bool> SendEmailAsync(string destinatario, string asunto, string cuerpoHtml, List<EmailAttachment>? adjuntos = null);
    }

    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IOptions<EmailSettings> emailSettings, ILogger<EmailService> logger)
        {
            _emailSettings = emailSettings.Value;
            _logger = logger;
        }

        public async Task<bool> SendFacturaEmailAsync(string destinatario, string nombreCliente, byte[] pdfFactura, string numeroFactura, string uuid)
        {
            try
            {
                var asunto = $"Factura Electrónica {numeroFactura} - Punto de Venta Empresarial";

                var cuerpoHtml = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }}
        .header {{
            background-color: #8b0000;
            color: white;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }}
        .content {{
            padding: 30px;
        }}
        .info-box {{
            background-color: #f9f9f9;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #8b0000;
            border-radius: 4px;
        }}
        .info-row {{
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }}
        .important-box {{
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }}
        .important-box ul {{
            margin: 10px 0;
            padding-left: 20px;
        }}
        .footer {{
            background-color: #f0f0f0;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>✓ Factura Electrónica</h1>
            <p style='margin: 10px 0 0 0; font-size: 14px;'>CFDI 4.0 - Comprobante Fiscal Digital</p>
        </div>
        
        <div class='content'>
            <p style='font-size: 18px; margin-bottom: 20px;'>
                Estimado/a <strong>{nombreCliente}</strong>,
            </p>
            
            <p>¡Gracias por su compra! Le enviamos su factura electrónica correspondiente a su reciente transacción.</p>
            
            <div class='info-box'>
                <div style='font-weight: bold; color: #8b0000; margin-bottom: 10px;'>📄 Información de su Factura</div>
                <div class='info-row'><strong>Número de Factura:</strong> {numeroFactura}</div>
                <div class='info-row'><strong>UUID (Folio Fiscal):</strong> {uuid}</div>
                <div class='info-row' style='border-bottom: none;'><strong>Fecha de Emisión:</strong> {DateTime.Now:dd/MM/yyyy HH:mm:ss}</div>
            </div>
            
            <p>Su factura en formato PDF se encuentra adjunta a este correo electrónico. Este documento tiene plena validez fiscal ante el SAT.</p>
            
            <div class='important-box'>
                <h3 style='margin: 0 0 10px 0; color: #856404;'>⚠️ Información Importante</h3>
                <ul style='color: #856404;'>
                    <li>Este documento es un Comprobante Fiscal Digital por Internet (CFDI) con validez oficial</li>
                    <li>Conserve este correo y el archivo PDF adjunto para futuras referencias</li>
                    <li>La factura contiene el UUID requerido por el SAT para su validación</li>
                    <li>Puede verificar su factura en el portal del SAT usando el folio fiscal (UUID)</li>
                </ul>
            </div>
            
            <p style='text-align: center; color: #666; margin-top: 30px;'>Si tiene alguna duda o requiere asistencia, no dude en contactarnos.</p>
            
            <p style='text-align: center; margin-top: 20px;'><strong>¡Gracias por su preferencia!</strong></p>
        </div>
        
        <div class='footer'>
            <p><strong>Punto de Venta Empresarial</strong></p>
            <p>📧 {_emailSettings.SenderEmail}</p>
            <p style='margin-top: 15px;'>Este es un correo automático, por favor no responda a esta dirección.</p>
            <p>© {DateTime.Now.Year} Todos los derechos reservados</p>
        </div>
    </div>
</body>
</html>";

                var adjuntos = new List<EmailAttachment>
                {
                    new EmailAttachment
                    {
                        Content = pdfFactura,
                        FileName = $"Factura_{numeroFactura}.pdf",
                        MediaType = "application/pdf"
                    }
                };

                return await SendEmailAsync(destinatario, asunto, cuerpoHtml, adjuntos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al enviar factura por email a {Destinatario}", destinatario);
                return false;
            }
        }

        public async Task<bool> SendEmailAsync(string destinatario, string asunto, string cuerpoHtml, List<EmailAttachment>? adjuntos = null)
        {
            try
            {
                _logger.LogInformation("Enviando email a {Destinatario} con asunto: {Asunto}", destinatario, asunto);

                using var message = new MailMessage();
                message.From = new MailAddress(_emailSettings.SenderEmail, _emailSettings.SenderName);
                message.To.Add(new MailAddress(destinatario));
                message.Subject = asunto;
                message.Body = cuerpoHtml;
                message.IsBodyHtml = true;
                message.Priority = MailPriority.Normal;

                // Agregar adjuntos si existen
                if (adjuntos != null && adjuntos.Any())
                {
                    foreach (var adjunto in adjuntos)
                    {
                        var stream = new MemoryStream(adjunto.Content);
                        var attachment = new Attachment(stream, adjunto.FileName, adjunto.MediaType);
                        message.Attachments.Add(attachment);
                    }
                }

                using var smtpClient = new SmtpClient(_emailSettings.SmtpServer, _emailSettings.SmtpPort);
                smtpClient.EnableSsl = true;
                smtpClient.UseDefaultCredentials = false;
                smtpClient.Credentials = new NetworkCredential(_emailSettings.Username, _emailSettings.Password);
                smtpClient.DeliveryMethod = SmtpDeliveryMethod.Network;
                smtpClient.Timeout = 30000; // 30 segundos

                await smtpClient.SendMailAsync(message);

                _logger.LogInformation("Email enviado exitosamente a {Destinatario}", destinatario);
                return true;
            }
            catch (SmtpException ex)
            {
                _logger.LogError(ex, "Error SMTP al enviar email a {Destinatario}: {Message}", destinatario, ex.Message);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error general al enviar email a {Destinatario}", destinatario);
                return false;
            }
        }
    }
}