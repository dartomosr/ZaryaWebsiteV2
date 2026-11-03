using Microsoft.AspNetCore.Mvc;

namespace ZaryaWebSite.WebApi.DTO.Response;

internal record UpdateResponseDto
{
    public required string Id { get; init; }

    public required string Title { get; init; }

    public required string Summary { get; init; }

    public required PhysicalFileResult Image { get; init; }

    public required string PublishedAt { get; init; }
}
