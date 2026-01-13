using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("ImagenesProducto")]
    public class ImagenProducto
    {
        [Key]
        public int ImagenId { get; set; }

        [Required]
        public int ProductoId { get; set; }

        [Required]
        [MaxLength(1000)]
        public string Url { get; set; } = string.Empty;

        [Required]
        public int Orden { get; set; } = 0;

        [ForeignKey("ProductoId")]
        public virtual Producto Producto { get; set; } = null!;
    }
}
