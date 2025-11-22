from django.db import models


class UploadedDocument(models.Model):
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Document {self.id} - {self.uploaded_at}"
