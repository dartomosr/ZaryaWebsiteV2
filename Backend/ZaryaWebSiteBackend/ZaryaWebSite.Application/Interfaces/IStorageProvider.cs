namespace ZaryaWebSite.Application.Interfaces;

public interface IStorageProvider
{
    public Task<IReadOnlyCollection<Domain.News>> GetNewsPageAsync(int pageNumber, int pageSize);
}
