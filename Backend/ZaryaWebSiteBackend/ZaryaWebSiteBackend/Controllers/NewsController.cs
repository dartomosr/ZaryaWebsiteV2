using MediatR;
using Microsoft.AspNetCore.Mvc;
using ZaryaWebSite.Application.Images.Get;
using ZaryaWebSite.Application.News.Get;
using ZaryaWebSite.WebApi.DTO.Response;

namespace ZaryaWebSite.WebApi.Controllers;

[ApiController, Route("Api/[controller]")]
public class NewsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetNews(int page, int pageSize)
    {
        var getNewsQuery = new GetNewsQuery(page, pageSize);

        var news = await sender.Send(getNewsQuery);

        var tasks = news.Select(CastNewsToResponse);
        var newsResponses = await Task.WhenAll(tasks);

        return Ok(newsResponses);
    }

    private async Task<NewsResponseDto> CastNewsToResponse(Domain.News news)
    {
        var getImageQuery = new GetImageQuery(news.Id);
        var imagePath = await sender.Send(getImageQuery);
        var newsResponseDto = new NewsResponseDto()
        {
            Id = news.Id.ToString(),
            PublishedAt = news.PublishedAt,
            Summary = news.Summary,
            Url = PhysicalFile(imagePath, "image/jpeg"),
            Title = news.Title
        };
        return newsResponseDto;
    }
}
