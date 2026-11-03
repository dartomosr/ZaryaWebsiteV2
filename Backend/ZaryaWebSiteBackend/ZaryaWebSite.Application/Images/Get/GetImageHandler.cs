using MediatR;
using ZaryaWebSite.Application.Interfaces;

namespace ZaryaWebSite.Application.Images.Get;

public class GetImageHandler(IImageProvider storageProvider) : IRequestHandler<GetImageQuery, string>
{
    public async Task<string> Handle(GetImageQuery request, CancellationToken cancellationToken)
    {
        return await storageProvider.GetImagePath(request.Id);
    }
}
