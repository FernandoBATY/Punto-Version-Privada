using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("Proveedores")]
    public class Proveedor
    {
        [Key]
        public int ProveedorId { get; set; }

        [Required]
        [MaxLength(255)]
        public string Correo { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        public string Contrasena { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Nombre { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Apellido { get; set; } = string.Empty;

        [MaxLength(13)]
        public string? RFC { get; set; }

        [MaxLength(20)]
        public string? Telefono { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        [MaxLength(3)]
        public string? RegimenFiscal { get; set; }

        [MaxLength(5)]
        public string? CodigoPostal { get; set; }

        public virtual ICollection<Producto> Productos { get; set; } = new List<Producto>();
        public virtual ICollection<Orden> Ordenes { get; set; } = new List<Orden>();
    }
}
