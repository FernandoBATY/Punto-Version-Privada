using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using PuntoVenta.Data;
using DinkToPdf;
using DinkToPdf.Contracts;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});


builder.Services.AddDbContext<PuntoVentaDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add DinkToPdf service
builder.Services.AddSingleton(typeof(IConverter), new SynchronizedConverter(new PdfTools()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(); 
}

app.UseHttpsRedirection();

// Use CORS
app.UseCors("AllowReactApp");

// Servir archivos estáticos desde wwwroot (para imágenes subidas)
app.UseStaticFiles();

// Servir archivos estáticos desde la carpeta media del frontend
var frontendMediaPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "frontend", "public", "media");
if (Directory.Exists(frontendMediaPath))
{
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(frontendMediaPath),
        RequestPath = "/media"
    });
}

app.MapControllers();


// La base de datos ya existe, no necesitamos crearla
// using (var scope = app.Services.CreateScope())
// {
//     var context = scope.ServiceProvider.GetRequiredService<PuntoVentaDbContext>();
//     context.Database.EnsureCreated();
// }

app.Run();
