using ZaryaWebSite.Application.Interfaces;
using ZaryaWebSite.Domain;
using System.Text.Json;

namespace ZaryaWebSite.StorageProvider;

public class JsonProvider(string newsFilePath, string updatesFilePath) : IStorageProvider
{
    public async Task<News> GetNewsByIdAsync(int id)
    {
        var news = await ReadAsync<News>(newsFilePath);

        return news.First(item => item.Id == id);
    }

    public async Task<IReadOnlyCollection<News>> GetNewsAsync(int page, int pageSize)
    {
        var news = await ReadAsync<News>(newsFilePath);

        return news
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();
    }

    public async Task<Update> GetUpdateByIdAsync(int id)
    {
        var updates = await ReadAsync<Update>(updatesFilePath);

        return updates.First(item => item.Id == id);
    }

    public async Task<IReadOnlyCollection<Update>> GetUpdatesAsync(int page, int pageSize)
    {
        var updates = await ReadAsync<Update>(updatesFilePath);

        return updates
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToArray();
    }

    private static async Task<List<T>> ReadAsync<T>(string filePath)
    {
        var options = new FileStreamOptions
        {
            Mode = FileMode.Open,
            Access = FileAccess.Read,
            Share = FileShare.Read,
            BufferSize = 4096,
            Options = FileOptions.Asynchronous
        };

        await using var stream = new FileStream(filePath, options);
        return await JsonSerializer.DeserializeAsync<List<T>>(stream) ?? [];
    }
}
