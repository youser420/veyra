from adapters.generic_http import GenericHttpAdapter


class MakeAdapter(GenericHttpAdapter):
    """Make.com scenarios are webhook URLs — use generic POST with prompt in body."""

    framework = "make"
