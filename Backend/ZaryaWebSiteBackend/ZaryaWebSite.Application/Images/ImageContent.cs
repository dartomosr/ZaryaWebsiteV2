namespace ZaryaWebSite.Application.Images;

internal class ImageContent
{
    internal required Stream Content { get; init; }

    internal required string FileName { get; init; }

    internal required string ContentType { get; init; }
}
