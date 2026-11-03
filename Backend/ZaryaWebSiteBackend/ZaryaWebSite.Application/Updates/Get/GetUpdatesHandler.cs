using MediatR;
using ZaryaWebSite.Application.Interfaces;

namespace ZaryaWebSite.Application.Updates.Get;

public class GetUpdatesHandler(IStorageProvider storageProvider) : IRequestHandler<GetUpdatesQuery, IReadOnlyCollection<Domain.Update>>
{
    public async Task<IReadOnlyCollection<Domain.Update>> Handle(GetUpdatesQuery request, CancellationToken cancellationToken)
    {
        return await storageProvider.GetUpdatesAsync(request.Page, request.PageSize);
    }
}
