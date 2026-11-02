using MediatR;
using ZaryaWebSite.Application.Interfaces;

namespace ZaryaWebSite.Application.News.Get;

public class GetNewsHandler(IStorageProvider storageProvider) : IRequestHandler<GetNewsQuery, IReadOnlyCollection<Domain.News>>
{
    public async Task<IReadOnlyCollection<Domain.News>> Handle(GetNewsQuery request, CancellationToken cancellationToken)
    {
        return await storageProvider.GetNewsPageAsync(request.pageNumber, request.pageSize);
    }
}
