using ZaryaWebSite.Application.Interfaces;
using ZaryaWebSite.Application.News.Get;
using ZaryaWebSite.ImageProvider;

namespace ZaryaWebSite.WebApi;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        var imageStoragePath = builder.Configuration["ImageStorage:Path"] ?? Path.Combine("Storage", "Images");
        builder.Configuration["ImageStorage:Path"] = Path.GetFullPath(imageStoragePath, builder.Environment.ContentRootPath);
        builder.Services.AddControllers();
        builder.Services.AddOpenApi();

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("Frontend", policy =>
            {
                policy.WithOrigins("http://127.0.0.1:5173")
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        builder.Services.AddScoped<IStorageProvider, StorageProvider.JsonPlateProvider>();
        builder.Services.AddScoped<IImageProvider, ImageProvider.ImageProvider>();
        builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(GetNewsHandler).Assembly));

        var app = builder.Build();

        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        app.UseHttpsRedirection();
        app.UseAuthorization();
        app.MapControllers();

        app.Run();
    }
}
