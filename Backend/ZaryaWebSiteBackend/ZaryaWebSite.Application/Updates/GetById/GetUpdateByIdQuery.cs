using MediatR;

namespace ZaryaWebSite.Application.Updates.GetById;

public record GetUpdateByIdQuery(int Id) : IRequest<Domain.Update>;
