using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("Ordenes")]
    public class Orden
    {
        [Key]
        public int OrdenId { get; set; }

        [Required]
        public int ClienteId { get; set; }

        [Required]
        public int ProveedorId { get; set; }

        [Required]
        [MaxLength(50)]
        public string EstadoOrden { get; set; } = "Pendiente";

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Total { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime? FechaPago { get; set; }

        [ForeignKey("ClienteId")]
        public virtual Cliente Cliente { get; set; } = null!;

        [ForeignKey("ProveedorId")]
        public virtual Proveedor Proveedor { get; set; } = null!;

        public virtual ICollection<ItemOrden> Items { get; set; } = new List<ItemOrden>();
        public virtual ICollection<Pago> Pagos { get; set; } = new List<Pago>();
        public virtual Factura? Factura { get; set; }
    }
}

