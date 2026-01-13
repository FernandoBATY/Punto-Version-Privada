using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("ItemsCesta")]
    public class ItemCesta
    {
        [Key]
        public int ItemCestaId { get; set; }

        [Required]
        public int CestaId { get; set; }

        [Required]
        public int ProductoId { get; set; }

        [Required]
        public int Cantidad { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal PrecioUnitario { get; set; }

        public DateTime FechaAgregado { get; set; } = DateTime.UtcNow;

        [ForeignKey("CestaId")]
        public virtual Cesta Cesta { get; set; } = null!;

        [ForeignKey("ProductoId")]
        public virtual Producto Producto { get; set; } = null!;
    }
}
