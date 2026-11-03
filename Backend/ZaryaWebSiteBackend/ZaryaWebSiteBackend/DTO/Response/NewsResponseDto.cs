using Microsoft.AspNetCore.Mvc;

namespace ZaryaWebSite.WebApi.DTO.Response;

internal record NewsResponseDto
{
    [FromForm(Name = "id")]
    internal required string Id { get; init; }

    [FromForm(Name = "title")]
    internal required string Title { get; init; }

    [FromForm(Name = "summary")]
    internal required string Summary { get; init; }
    
    [FromForm(Name = "url")]
    internal required PhysicalFileResult Url { get; init; }

    [FromForm(Name = "publishedAt")]
    internal required string PublishedAt { get; init; }
}
