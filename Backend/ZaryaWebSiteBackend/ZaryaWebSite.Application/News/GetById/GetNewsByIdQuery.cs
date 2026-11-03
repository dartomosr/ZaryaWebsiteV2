using MediatR;

namespace ZaryaWebSite.Application.News.GetById;

public record GetNewsByIdQuery(int Id) : IRequest<Domain.News>;
