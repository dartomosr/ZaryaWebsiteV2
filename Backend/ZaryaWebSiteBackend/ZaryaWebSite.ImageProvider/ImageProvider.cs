using ZaryaWebSite.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace ZaryaWebSite.ImageProvider;

public class ImageProvider : IImageProvider
{
    private readonly string _storagePath;

    public ImageProvider(IConfiguration configuration)
    {
        var configuredPath = configuration["ImageStorage:Path"] ?? Path.Combine("Storage", "Images");
        _storagePath = Path.IsPathRooted(configuredPath)
            ? configuredPath
            : Path.Combine(AppContext.BaseDirectory, configuredPath);
    }

    public Task<string> GetImagePath(int id)
    {
        var imagePath = Directory.Exists(_storagePath)
            ? Directory.EnumerateFiles(_storagePath, $"{id}.*").FirstOrDefault()
            : null;

        if (imagePath is null)
        {
            throw new FileNotFoundException(
                $"Image with id {id} was not found in '{_storagePath}' (expected file name '{id}.*').",
                Path.Combine(_storagePath, $"{id}.*"));
        }

        return Task.FromResult(imagePath);
    }

    public async Task SaveImage(int id, Stream image, string extension)
    {
        ArgumentNullException.ThrowIfNull(image);

        var normalizedExtension = NormalizeExtension(extension);
        Directory.CreateDirectory(_storagePath);

        var imagePath = Path.Combine(_storagePath, $"{id}{normalizedExtension}");
        await using var destination = new FileStream(imagePath, FileMode.Create, FileAccess.Write, FileShare.None);
        await image.CopyToAsync(destination);
    }

    private static string NormalizeExtension(string extension)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(extension);
        var normalized = extension.StartsWith('.') ? extension : $".{extension}";
        if (normalized.Length < 2 || normalized.Skip(1).Any(character => !char.IsLetterOrDigit(character)))
            throw new ArgumentException("Image extension must contain only letters and digits.", nameof(extension));

        return normalized.ToLowerInvariant();
    }
}
