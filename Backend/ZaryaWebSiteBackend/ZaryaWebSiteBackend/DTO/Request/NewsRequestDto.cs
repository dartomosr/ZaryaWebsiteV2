using Microsoft.AspNetCore.Mvc;

namespace ZaryaWebSite.WebApi.DTO.Request;

internal record NewsRequestDto
{
    [FromForm(Name = "id")]
    internal required string Id { get; init; }

    [FromForm(Name = "title")]
    internal required string Title { get; init; }

    [FromForm(Name = "summary")]
    internal required string Summary { get; init; }
    
    [FromForm(Name = "image")]
    internal required IFormFile Image { get; init; }

    [FromForm(Name = "publishedAt")]
    internal required string PublishedAt { get; init; }
}
