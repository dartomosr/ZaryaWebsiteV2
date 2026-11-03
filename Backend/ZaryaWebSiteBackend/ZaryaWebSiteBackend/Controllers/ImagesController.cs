using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using ZaryaWebSite.Application.Images.Get;

namespace ZaryaWebSite.WebApi.Controllers;

[ApiController, Route("Api/[controller]")]
public class ImagesController(ISender sender) : ControllerBase
{
    private static readonly FileExtensionContentTypeProvider ContentTypeProvider = new();

    [HttpGet("{imageId:int}")]
    public async Task<IActionResult> GetImage(int imageId)
    {
        string imagePath;
        try
        {
            imagePath = await sender.Send(new GetImageQuery(imageId));
        }
        catch (FileNotFoundException)
        {
            return NotFound();
        }

        var contentType = ContentTypeProvider.TryGetContentType(imagePath, out var detectedContentType) ? detectedContentType : "application/octet-stream";

        return PhysicalFile(imagePath, contentType);
    }
}
