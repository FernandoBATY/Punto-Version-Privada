using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PuntoVenta.Models
{
    [Table("Cestas")]
    public class Cesta
    {
        [Key]
        public int CestaId { get; set; }

        [Required]
        public int ClienteId { get; set; }

        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        public DateTime FechaActualizacion { get; set; } = DateTime.UtcNow;

       
        [ForeignKey("ClienteId")]
        public virtual Cliente Cliente { get; set; } = null!;

        public virtual ICollection<ItemCesta> Items { get; set; } = new List<ItemCesta>();
    }
}
