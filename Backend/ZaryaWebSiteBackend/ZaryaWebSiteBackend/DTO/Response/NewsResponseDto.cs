using Microsoft.AspNetCore.Mvc;

namespace ZaryaWebSite.WebApi.DTO.Response;

internal record NewsResponseDto
{
    internal required string Id { get; init; }

    internal required string Title { get; init; }

    internal required string Summary { get; init; }
    
    internal required PhysicalFileResult Image { get; init; }

    internal required string PublishedAt { get; init; }
}
