using ZaryaWebSite.Application.Interfaces;
using ZaryaWebSite.Domain;
using System.Text.Json;

namespace ZaryaWebSite.StorageProvider;

public class JsonPlateProvider : IStorageProvider
{
    private const string StorageDirectory = "Storage";
    private const string NewsFileName = "news.json";

    public async Task<IReadOnlyCollection<Domain.News>> GetNewsAsync(int page, int pageSize)
    {
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

        return news
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();
    }
}
