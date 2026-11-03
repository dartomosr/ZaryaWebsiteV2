namespace ZaryaWebSite.Application.Interfaces;

public interface IStorageProvider
{
    public Task<IReadOnlyCollection<Domain.News>> GetNewsAsync(int page, int pageSize);
}
