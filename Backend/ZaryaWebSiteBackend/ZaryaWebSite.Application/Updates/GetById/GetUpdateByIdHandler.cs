using MediatR;
using ZaryaWebSite.Application.Interfaces;

namespace ZaryaWebSite.Application.Updates.GetById;

public class GetUpdateByIdHandler(IStorageProvider storageProvider) : IRequestHandler<GetUpdateByIdQuery, Domain.Update>
{
    public async Task<Domain.Update> Handle(GetUpdateByIdQuery request, CancellationToken cancellationToken)
    {
        return await storageProvider.GetUpdateByIdAsync(request.Id);
    }
}
