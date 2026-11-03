namespace ZaryaWebSite.Application.Interfaces;

public interface IImageProvider
{
    Task<string> GetImagePath(int id);

    Task SaveImage(int id, Stream image, string extension);
}
