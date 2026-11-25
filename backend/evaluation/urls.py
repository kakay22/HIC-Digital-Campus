
from django.urls import path, include

urlpatterns = [
    path("", include("evaluation.api.urls")),
]
