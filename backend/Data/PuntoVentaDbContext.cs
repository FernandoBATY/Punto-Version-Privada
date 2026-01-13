using Microsoft.EntityFrameworkCore;
using PuntoVenta.Models;

namespace PuntoVenta.Data
{
    public class PuntoVentaDbContext : DbContext
    {
        public PuntoVentaDbContext(DbContextOptions<PuntoVentaDbContext> options) : base(options)
        {
        }

        public DbSet<Cliente> Clientes { get; set; }
        public DbSet<Proveedor> Proveedores { get; set; }
        public DbSet<Categoria> Categorias { get; set; }
        public DbSet<TipoProducto> TiposProducto { get; set; }
        public DbSet<Producto> Productos { get; set; }
        public DbSet<ImagenProducto> ImagenesProducto { get; set; }
        public DbSet<Cesta> Cestas { get; set; }
        public DbSet<ItemCesta> ItemsCesta { get; set; }
        public DbSet<Orden> Ordenes { get; set; }
        public DbSet<ItemOrden> ItemsOrden { get; set; }
        public DbSet<Pago> Pagos { get; set; }
        public DbSet<Factura> Facturas { get; set; }
        public DbSet<ItemFactura> ItemsFactura { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Cliente>(entity =>
            {
                entity.HasKey(e => e.ClienteId);
                entity.Property(e => e.Correo).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Contrasena).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Apellido).IsRequired().HasMaxLength(100);
                entity.Property(e => e.RFC).HasMaxLength(13);
                entity.Property(e => e.Telefono).HasMaxLength(20);
                entity.Property(e => e.FechaCreacion).HasDefaultValueSql("SYSUTCDATETIME()");
                entity.Property(e => e.RegimenFiscal).IsRequired().HasMaxLength(3);
                entity.Property(e => e.CodigoPostal).HasMaxLength(5);
                entity.Property(e => e.UsoCFDI).HasMaxLength(3);
                entity.HasIndex(e => e.Correo).IsUnique();
            });

            modelBuilder.Entity<Proveedor>(entity =>
            {
                entity.HasKey(e => e.ProveedorId);
                entity.Property(e => e.Correo).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Contrasena).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Apellido).IsRequired().HasMaxLength(100);
                entity.Property(e => e.RFC).HasMaxLength(13);
                entity.Property(e => e.Telefono).HasMaxLength(20);
                entity.Property(e => e.FechaCreacion).HasDefaultValueSql("SYSUTCDATETIME()");
                entity.Property(e => e.RegimenFiscal).HasMaxLength(3);
                entity.Property(e => e.CodigoPostal).HasMaxLength(5);
                entity.HasIndex(e => e.Correo).IsUnique();
            });

            modelBuilder.Entity<Categoria>(entity =>
            {
                entity.HasKey(e => e.CategoriaId);
                entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Descripcion).HasMaxLength(500);
                entity.HasIndex(e => e.Nombre).IsUnique();
            });

            modelBuilder.Entity<TipoProducto>(entity =>
            {
                entity.HasKey(e => e.TipoProductoId);
                entity.Property(e => e.Nombre).IsRequired().HasMaxLength(100);
                entity.HasIndex(e => e.Nombre).IsUnique();
            });

            modelBuilder.Entity<Producto>(entity =>
            {
                entity.HasKey(e => e.ProductoId);
                entity.Property(e => e.Nombre).IsRequired().HasMaxLength(200);
                entity.Property(e => e.Descripcion).HasMaxLength(1000);
                entity.Property(e => e.Precio).HasColumnType("decimal(10,2)");
                entity.Property(e => e.Stock).HasDefaultValue(0);
                entity.Property(e => e.Activo).HasDefaultValue(true);
                entity.Property(e => e.FechaCreacion).HasDefaultValueSql("SYSUTCDATETIME()");

                entity.HasOne(d => d.Proveedor)
                    .WithMany(p => p.Productos)
                    .HasForeignKey(d => d.ProveedorId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Categoria)
                    .WithMany(p => p.Productos)
                    .HasForeignKey(d => d.CategoriaId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(d => d.TipoProducto)
                    .WithMany(p => p.Productos)
                    .HasForeignKey(d => d.TipoProductoId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<ImagenProducto>(entity =>
            {
                entity.HasKey(e => e.ImagenId);
                entity.Property(e => e.Url).IsRequired().HasMaxLength(1000);
                entity.Property(e => e.Orden).HasDefaultValue(0);

                entity.HasOne(d => d.Producto)
                    .WithMany(p => p.Imagenes)
                    .HasForeignKey(d => d.ProductoId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<Cesta>(entity =>
            {
                entity.HasKey(e => e.CestaId);
                entity.Property(e => e.FechaCreacion).HasDefaultValueSql("SYSUTCDATETIME()");
                entity.Property(e => e.FechaActualizacion).HasDefaultValueSql("SYSUTCDATETIME()");

                entity.HasOne(d => d.Cliente)
                    .WithMany(p => p.Cestas)
                    .HasForeignKey(d => d.ClienteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

          
            modelBuilder.Entity<ItemCesta>(entity =>
            {
                entity.HasKey(e => e.ItemCestaId);
                entity.Property(e => e.Cantidad).HasAnnotation("CheckConstraint", "Cantidad > 0");
                entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(10,2)");
                entity.Property(e => e.FechaAgregado).HasDefaultValueSql("SYSUTCDATETIME()");

                entity.HasOne(d => d.Cesta)
                    .WithMany(p => p.Items)
                    .HasForeignKey(d => d.CestaId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(d => d.Producto)
                    .WithMany(p => p.ItemsCesta)
                    .HasForeignKey(d => d.ProductoId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => new { e.CestaId, e.ProductoId }).IsUnique();
            });

      
            modelBuilder.Entity<Orden>(entity =>
            {
                entity.HasKey(e => e.OrdenId);
                entity.Property(e => e.EstadoOrden).IsRequired().HasMaxLength(50).HasDefaultValue("Pendiente");
                entity.Property(e => e.Total).HasColumnType("decimal(12,2)");
                entity.Property(e => e.FechaCreacion).HasDefaultValueSql("SYSUTCDATETIME()");

                entity.HasOne(d => d.Cliente)
                    .WithMany(p => p.Ordenes)
                    .HasForeignKey(d => d.ClienteId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(d => d.Proveedor)
                    .WithMany(p => p.Ordenes)
                    .HasForeignKey(d => d.ProveedorId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<ItemOrden>(entity =>
            {
                entity.HasKey(e => e.ItemOrdenId);
                entity.Property(e => e.Cantidad).HasAnnotation("CheckConstraint", "Cantidad > 0");
                entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(10,2)");
              

                entity.HasOne(d => d.Orden)
                    .WithMany(p => p.Items)
                    .HasForeignKey(d => d.OrdenId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(d => d.Producto)
                    .WithMany(p => p.ItemsOrden)
                    .HasForeignKey(d => d.ProductoId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            
            modelBuilder.Entity<Pago>(entity =>
            {
                entity.HasKey(e => e.PagoId);
                entity.Property(e => e.MetodoPago).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Monto).HasColumnType("decimal(12,2)");
                entity.Property(e => e.Estado).IsRequired().HasMaxLength(50).HasDefaultValue("Procesando");
                entity.Property(e => e.FechaCreacion).HasDefaultValueSql("SYSUTCDATETIME()");

                entity.HasOne(d => d.Orden)
                    .WithMany(p => p.Pagos)
                    .HasForeignKey(d => d.OrdenId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

          
            modelBuilder.Entity<Factura>(entity =>
            {
                entity.HasKey(e => e.FacturaId);
                entity.Property(e => e.NumeroFactura).IsRequired().HasMaxLength(100);
                entity.Property(e => e.UUID).IsRequired().HasMaxLength(36);
                entity.Property(e => e.Total).HasColumnType("decimal(12,2)");
                entity.Property(e => e.FechaEmision).HasDefaultValueSql("SYSUTCDATETIME()");
                entity.Property(e => e.Serie).HasMaxLength(10).HasDefaultValue("A");
                entity.Property(e => e.Folio).IsRequired();
                entity.Property(e => e.LugarExpedicion).IsRequired().HasMaxLength(5);
                entity.Property(e => e.MetodoPago).IsRequired().HasMaxLength(3).HasDefaultValue("PUE");
                entity.Property(e => e.FormaPago).IsRequired().HasMaxLength(2).HasDefaultValue("03");

                entity.HasOne(d => d.Orden)
                    .WithOne(p => p.Factura)
                    .HasForeignKey<Factura>(d => d.OrdenId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(e => e.OrdenId).IsUnique();
                entity.HasIndex(e => e.NumeroFactura).IsUnique();
                entity.HasIndex(e => e.UUID).IsUnique();
            });

           
            modelBuilder.Entity<ItemFactura>(entity =>
            {
                entity.HasKey(e => e.ItemFacturaId);
                entity.Property(e => e.Cantidad).HasAnnotation("CheckConstraint", "Cantidad > 0");
                entity.Property(e => e.PrecioUnitario).HasColumnType("decimal(10,2)");
            

                entity.HasOne(d => d.Factura)
                    .WithMany(p => p.Items)
                    .HasForeignKey(d => d.FacturaId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(d => d.Producto)
                    .WithMany(p => p.ItemsFactura)
                    .HasForeignKey(d => d.ProductoId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
