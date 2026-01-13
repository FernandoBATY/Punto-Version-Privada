using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using PuntoVenta.Data;
using DinkToPdf;
using DinkToPdf.Contracts;
using Microsoft.Extensions.FileProviders;
using PuntoVenta.Services;
using PuntoVenta.Middleware;
using Serilog;

// Setup de Serilog para tener logs decentes
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .WriteTo.File("logs/log-.txt", rollingInterval: RollingInterval.Day)
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog();


builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS para que el frontend pueda conectarse
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});


builder.Services.AddDbContext<PuntoVentaDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// PDF generator
builder.Services.AddSingleton(typeof(IConverter), new SynchronizedConverter(new PdfTools()));

builder.Services.Configure<EmailSettings>(builder.Configuration.GetSection("EmailSettings"));
builder.Services.AddScoped<IEmailService, EmailService>();


var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(); 
}

// Middleware custom
app.UseGlobalExceptionHandler();
app.UseRequestLogging();

app.UseHttpsRedirection();

// Headers de seguridad básicos
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next();
});

app.UseCors("AllowReactApp");
app.UseStaticFiles();

// Path para las imágenes del frontend
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

try
{
    Log.Information("Iniciando aplicación PuntoVenta");
    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "La aplicación terminó inesperadamente");
}
finally
{
    Log.CloseAndFlush();
}
