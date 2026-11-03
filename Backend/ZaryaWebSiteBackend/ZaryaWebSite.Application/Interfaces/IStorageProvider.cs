namespace ZaryaWebSite.Application.Interfaces;

public interface IStorageProvider
{
    public Task<IReadOnlyCollection<Domain.News>> GetNewsAsync(int page, int pageSize);

    public Task<Domain.News> GetNewsByIdAsync(int id);

    public Task<IReadOnlyCollection<Domain.Update>> GetUpdatesAsync(int page, int pageSize);

    public Task<Domain.Update> GetUpdateByIdAsync(int id);
}
