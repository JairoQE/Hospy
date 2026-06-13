from hospix.services.page_context import (
    describe_page,
    is_page_location_question,
    reply_page_location,
)


def test_describe_page_home():
    page = describe_page("/")
    assert page["kind"] == "home"
    assert page["is_error"] is False


def test_describe_page_accommodation():
    page = describe_page("/hospedajes/42")
    assert page["kind"] == "accommodation_detail"
    assert page["accommodation_id"] == "42"


def test_describe_page_unknown_is_404():
    page = describe_page("/45465414")
    assert page["kind"] == "not_found"
    assert page["is_error"] is True


def test_describe_page_login_subpath_is_404():
    page = describe_page("/login/404")
    assert page["kind"] == "not_found"


def test_page_location_question():
    assert is_page_location_question("En qué pagina estoy?")
    assert not is_page_location_question("Buscar hospedaje en Lima")


def test_reply_page_location_404():
    text = reply_page_location("/45465414", formal=False)
    assert "404" in text
    assert "ficha" not in text.lower()
