using MediatR;
using Microsoft.AspNetCore.Mvc;
using ZaryaWebSite.Application.Images.Get;
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

        var tasks = updates.Select(CastUpdateToResponse);
        var updateResponses = await Task.WhenAll(tasks);

        return Ok(updateResponses);
    }

    [HttpGet("{updateId}")]
    public async Task<IActionResult> GetUpdateById(int updateId)
    {
        var getUpdateByIdQuery = new GetUpdateByIdQuery(updateId);

        var update = await sender.Send(getUpdateByIdQuery);
        var updateResponse = await CastUpdateToResponse(update);

        return Ok(updateResponse);
    }

    private async Task<UpdateResponseDto> CastUpdateToResponse(Domain.Update update)
    {
        var getImageQuery = new GetImageQuery(update.Id);
        var imagePath = await sender.Send(getImageQuery);
        var updateResponseDto = new UpdateResponseDto()
        {
            Id = update.Id.ToString(),
            PublishedAt = update.PublishedAt,
            Summary = update.Summary,
            Image = PhysicalFile(imagePath, "image/jpeg"),
            Title = update.Title
        };
        return updateResponseDto;
    }
}
