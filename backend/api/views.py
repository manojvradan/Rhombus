import pandas as pd
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import UploadedDocument


class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file_obj = request.FILES.get('file')

        if not file_obj:
            return Response({"error": "No file provided"},
                            status=status.HTTP_400_BAD_REQUEST)

        # 1. Save to S3 (via Model)
        document = UploadedDocument.objects.create(file=file_obj)

        # 2. Process Data for Preview
        try:

            document.file.open()

            filename = document.file.name.lower()

            if filename.endswith('.csv'):
                df = pd.read_csv(document.file)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(document.file)
            else:
                return Response({"error": "Unsupported file type"}, 
                                status=status.HTTP_400_BAD_REQUEST)

            # Replace NaN with None (null) for valid JSON
            df = df.where(pd.notnull(df), None)

            # Convert to list of dictionaries
            data_preview = df.to_dict(orient='records')

            return Response({
                "message": "File uploaded successfully",
                "file_id": document.id,
                "file_url": document.file.url,
                "data": data_preview  # Returns the tabular data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
