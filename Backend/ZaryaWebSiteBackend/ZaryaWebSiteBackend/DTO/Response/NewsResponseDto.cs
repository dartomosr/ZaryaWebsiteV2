namespace ZaryaWebSite.WebApi.DTO.Response;

internal record NewsResponseDto
{
    public required string Id { get; init; }

    public required string Title { get; init; }

    public required string Summary { get; init; }
    
    public required string UrlToImage { get; init; }

    public required string PublishedAt { get; init; }
}
