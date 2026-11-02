using MediatR;

namespace ZaryaWebSite.Application.News.Get;

public record GetNewsQuery (int pageNumber, int pageSize) : IRequest<IReadOnlyCollection<Domain.News>>;