from django.urls import path
from .views import (
    FileUploadView,
    GenerateRegexView,
    ApplyRegexView,
    DownloadFileView,
    GenerateFilterView,
    ApplyFilterView,
    )

urlpatterns = [
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path(
        'generate-regex/', GenerateRegexView.as_view(), name='generate-regex'
        ),
    path('apply-regex/', ApplyRegexView.as_view(), name='apply-regex'),
    path('download/<int:file_id>/',
         DownloadFileView.as_view(),
         name='download-file'
         ),
    path('generate-filter/', GenerateFilterView.as_view()),
    path('apply-filter/', ApplyFilterView.as_view()),
]
