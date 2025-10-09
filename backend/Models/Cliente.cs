using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("Clientes")]
    public class Cliente
    {
        [Key]
        public int ClienteId { get; set; }

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

        [Required]
        [MaxLength(3)]
        public string RegimenFiscal { get; set; } = string.Empty;

        [MaxLength(5)]
        public string? CodigoPostal { get; set; }

        [MaxLength(3)]
        public string? UsoCFDI { get; set; }

        
        public virtual ICollection<Cesta> Cestas { get; set; } = new List<Cesta>();
        public virtual ICollection<Orden> Ordenes { get; set; } = new List<Orden>();
    }
}

