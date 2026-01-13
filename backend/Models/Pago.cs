using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("Pagos")]
    public class Pago
    {
        [Key]
        public int PagoId { get; set; }

        [Required]
        public int OrdenId { get; set; }

        [Required]
        [MaxLength(50)]
        public string MetodoPago { get; set; } = string.Empty;

        [Required]
        [Column(TypeName = "decimal(12,2)")]
        public decimal Monto { get; set; }

        [Required]
        [MaxLength(50)]
        public string Estado { get; set; } = "Procesando";

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        [ForeignKey("OrdenId")]
        public virtual Orden Orden { get; set; } = null!;
    }
}
