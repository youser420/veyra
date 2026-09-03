from adapters.generic_http import GenericHttpAdapter


class MakeAdapter(GenericHttpAdapter):
    """Make.com scenarios are webhook URLs — use generic POST with prompt in body."""

    framework = "make"

    async def invoke(self, prompt: str, **kwargs):
        # Make webhooks often expect custom JSON; try prompt wrapper first.
        return await super().invoke(prompt, **kwargs)
