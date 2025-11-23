from django.urls import path
from .views import FileUploadView, GenerateRegexView

urlpatterns = [
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path(
        'generate-regex/', GenerateRegexView.as_view(), name='generate-regex'
        ),
]
