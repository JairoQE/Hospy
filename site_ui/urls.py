from django.urls import path

from .views import SiteDesignSettingsView

urlpatterns = [
    path("diseno/", SiteDesignSettingsView.as_view(), name="site-design"),
]
