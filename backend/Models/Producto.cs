using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("Productos")]
    public class Producto
    {
        [Key]
        public int ProductoId { get; set; }

        [Required]
        public int ProveedorId { get; set; }

        [Required]
        [MaxLength(200)]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(1000)]
        public string? Descripcion { get; set; }

        public int? CategoriaId { get; set; }

        public int? TipoProductoId { get; set; }

        [Required]
        [Column(TypeName = "decimal(10,2)")]
        public decimal Precio { get; set; }

        [Required]
        public int Stock { get; set; } = 0;

        [Required]
        public bool Activo { get; set; } = true;

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        [ForeignKey("ProveedorId")]
        public virtual Proveedor Proveedor { get; set; } = null!;

        [ForeignKey("CategoriaId")]
        public virtual Categoria? Categoria { get; set; }

        [ForeignKey("TipoProductoId")]
        public virtual TipoProducto? TipoProducto { get; set; }

        public virtual ICollection<ImagenProducto> Imagenes { get; set; } = new List<ImagenProducto>();
        public virtual ICollection<ItemCesta> ItemsCesta { get; set; } = new List<ItemCesta>();
        public virtual ICollection<ItemOrden> ItemsOrden { get; set; } = new List<ItemOrden>();
        public virtual ICollection<ItemFactura> ItemsFactura { get; set; } = new List<ItemFactura>();
    }
}
