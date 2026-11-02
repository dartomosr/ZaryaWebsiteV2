using MediatR;
using Microsoft.AspNetCore.Mvc;
using ZaryaWebSite.Application.News.Get;

namespace ZaryaWebSite.WebApi.Controllers;

[ApiController, Route("Api/[controller]")]
public class NewsController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetNews(int page, int pageSize)
    {
        var query = new GetNewsQuery(page, pageSize);

        var news = await sender.Send(query);

        return Ok(news);
    }
}