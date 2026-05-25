from django.urls import path

from .views import HospixChatView

urlpatterns = [
    path("chat/", HospixChatView.as_view(), name="hospix-chat"),
]
