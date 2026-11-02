using MediatR;

namespace ZaryaWebSite.Application.News.Get;

public record GetNewsQuery : IRequest<IReadOnlyCollection<Domain.News>>;
