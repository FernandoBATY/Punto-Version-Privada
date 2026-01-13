using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("Facturas")]
    public class Factura
    {
        [Key]
        public int FacturaId { get; set; }

        [Required]
        public int OrdenId { get; set; }

        [Required]
        [MaxLength(100)]
        public string NumeroFactura { get; set; } = string.Empty;

        [Required]
        [MaxLength(36)]
        public string UUID { get; set; } = string.Empty;

        public DateTime FechaEmision { get; set; } = DateTime.UtcNow;

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Total { get; set; }

        public string? FacturaXML { get; set; }

        public DateTime? FechaTimbrado { get; set; }

        [MaxLength(10)]
        public string Serie { get; set; } = "A";

        public int Folio { get; set; }

        [Required]
        [MaxLength(5)]
        public string LugarExpedicion { get; set; } = string.Empty;

        [Required]
        [MaxLength(3)]
        public string MetodoPago { get; set; } = "PUE";

        [Required]
        [MaxLength(2)]
        public string FormaPago { get; set; } = "03";

        [ForeignKey("OrdenId")]
        public virtual Orden Orden { get; set; } = null!;

        public virtual ICollection<ItemFactura> Items { get; set; } = new List<ItemFactura>();
    }
}
