using MediatR;

namespace ZaryaWebSite.Application.Updates.Get;

public record GetUpdatesQuery(int Page, int PageSize) : IRequest<IReadOnlyCollection<Domain.Update>>;
