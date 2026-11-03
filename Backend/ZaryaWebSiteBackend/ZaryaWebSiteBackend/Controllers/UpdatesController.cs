using MediatR;
using Microsoft.AspNetCore.Mvc;
using ZaryaWebSite.Application.Updates.Get;
using ZaryaWebSite.Application.Updates.GetById;
using ZaryaWebSite.WebApi.DTO.Response;

namespace ZaryaWebSite.WebApi.Controllers;

[ApiController, Route("Api/[controller]")]
public class UpdatesController(ISender sender) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetUpdates(int page, int pageSize)
    {
        var getUpdatesQuery = new GetUpdatesQuery(page, pageSize);

        var updates = await sender.Send(getUpdatesQuery);

        var updateResponses = updates.Select(CastUpdateToResponse).ToArray();

        return Ok(updateResponses);
    }

    [HttpGet("{updateId}")]
    public async Task<IActionResult> GetUpdateById(int updateId)
    {
        var getUpdateByIdQuery = new GetUpdateByIdQuery(updateId);

        var update = await sender.Send(getUpdateByIdQuery);
        var updateResponse = CastUpdateToResponse(update);

        return Ok(updateResponse);
    }

    private UpdateResponseDto CastUpdateToResponse(Domain.Update update)
    {
        var updateResponseDto = new UpdateResponseDto()
        {
            Id = update.Id.ToString(),
            PublishedAt = update.PublishedAt,
            Summary = update.Summary,
            UrlToImage = $"/api/images/{update.Id}",
            Title = update.Title
        };
        return updateResponseDto;
    }
}
