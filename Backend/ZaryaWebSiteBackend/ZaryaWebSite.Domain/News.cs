namespace ZaryaWebSite.Domain;

public class News
{
    public int Id { get; set; }

    public required string Title { get; set; }

    public required string Summary { get; set; }

    public required string PublishedAt { get; set; }
}
