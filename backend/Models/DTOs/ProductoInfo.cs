namespace PuntoVenta.Models.DTOs
{
    public class ProductoInfo
    {
        public int ProductoId { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public decimal Precio { get; set; }
        public int Stock { get; set; }
        public string? ImagenPrincipal { get; set; }
    }
}

