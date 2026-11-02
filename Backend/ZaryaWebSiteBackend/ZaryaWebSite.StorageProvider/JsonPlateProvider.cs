using ZaryaWebSite.Application.Interfaces;
using ZaryaWebSite.Domain;
using System.Text.Json;

namespace ZaryaWebSite.StorageProvider;

public class JsonPlateProvider : IStorageProvider
{
    private const string StorageDirectory = "Storage";
    private const string NewsFileName = "news.json";

    public async Task<IReadOnlyCollection<News>> GetNewsPageAsync(int pageNumber, int pageSize)
    {
        ArgumentOutOfRangeException.ThrowIfLessThan(pageNumber, 1);
        ArgumentOutOfRangeException.ThrowIfLessThan(pageSize, 1);

        var path = Path.Combine(AppContext.BaseDirectory, StorageDirectory, NewsFileName);
        var options = new FileStreamOptions
        {
            Mode = FileMode.Open,
            Access = FileAccess.Read,
            Share = FileShare.Read,
            BufferSize = 4096,
            Options = FileOptions.Asynchronous
        };

        await using var stream = new FileStream(path, options);
        var news = await JsonSerializer.DeserializeAsync<List<News>>(stream) ?? [];

        var skip = ((long)pageNumber - 1) * pageSize;
        return skip >= news.Count ? [] : news.Skip((int)skip).Take(pageSize).ToArray();
    }
}
