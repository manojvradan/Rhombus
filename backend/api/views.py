import pandas as pd
import numpy as np
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import UploadedDocument
from .services.llm import LLMService


class FileUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        file_obj = request.FILES.get('file')

        if not file_obj:
            return Response({"error": "No file provided"},
                            status=status.HTTP_400_BAD_REQUEST)

        # 1. Save to S3/Database
        document = UploadedDocument.objects.create(file=file_obj)

        try:
            # 2. Open the file
            # (ensure pointer is at start if S3 implementation varies)
            document.file.open()

            filename = document.file.name.lower()

            # 3. Read Data
            if filename.endswith('.csv'):
                df = pd.read_csv(document.file)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(document.file)
            else:
                return Response({"error": "Unsupported file type"},
                                status=status.HTTP_400_BAD_REQUEST)

            # 4. Data Cleaning for JSON Compliance
            # Replace NaN, Infinity, and -Infinity with None (JSON null)
            df = df.replace([np.nan, np.inf, -np.inf], None)

            # 5. LIMIT PREVIEW SIZE (Crucial for performance)
            # Only send the first 200 rows to the frontend for the preview
            # The full file is safely stored in S3 for later processing
            preview_df = df.head(200)

            # Convert to list of dictionaries
            data_preview = preview_df.to_dict(orient='records')

            return Response({
                "message": "File uploaded successfully",
                "file_id": document.id,
                "file_url": document.file.url,
                "data": data_preview,  # Returns the tabular data
                "total_rows": len(df)  # Useful to show "Displaying 50 of
                                       # 10,000 rows"
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GenerateRegexView(APIView):
    def post(self, request):
        prompt = request.data.get('prompt')

        if not prompt:
            return Response(
                {"error": "Prompt is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Call the LLM Service
            regex_pattern = LLMService.generate_regex(prompt)

            return Response({
                "prompt": prompt,
                "regex": regex_pattern,
                "message": "Pattern generated successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # Log the actual error
            print(f"Error generating regex: {str(e)}")
            return Response(
                {"error": "Failed to generate regex pattern"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
