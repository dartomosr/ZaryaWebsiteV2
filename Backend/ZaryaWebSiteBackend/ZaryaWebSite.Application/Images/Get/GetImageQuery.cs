using MediatR;

namespace ZaryaWebSite.Application.Images.Get;

public record GetImageQuery(int Id) : IRequest<string>;