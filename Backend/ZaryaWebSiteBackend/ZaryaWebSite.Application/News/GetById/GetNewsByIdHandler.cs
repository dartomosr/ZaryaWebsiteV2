using MediatR;
using ZaryaWebSite.Application.Interfaces;

namespace ZaryaWebSite.Application.News.GetById;

public class GetNewsByIdHandler(IStorageProvider storageProvider) : IRequestHandler<GetNewsByIdQuery, Domain.News>
{
    public async Task<Domain.News> Handle(GetNewsByIdQuery request, CancellationToken cancellationToken)
    {
        return await storageProvider.GetNewsByIdAsync(request.Id);
    }
}
