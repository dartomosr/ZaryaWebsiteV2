using MediatR;

namespace ZaryaWebSite.Application.News.Get;

public record GetNewsQuery(int Page, int PageSize) : IRequest<IReadOnlyCollection<Domain.News>>;
