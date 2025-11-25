import pandas as pd
import numpy as np
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from .models import UploadedDocument
from .services.llm import LLMService
from django.shortcuts import get_object_or_404
from django.core.files.base import ContentFile
from io import BytesIO
from django.http import FileResponse


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
        data_context = request.data.get('data_context')

        if not prompt:
            return Response(
                {"error": "Prompt is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Call the LLM Service
            regex_pattern = LLMService.generate_regex(prompt, data_context)

            return Response({
                "prompt": prompt,
                "regex": regex_pattern.get('regex'),
                "column": regex_pattern.get('column'),
                "message": "Pattern generated successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            # Log the actual error
            print(f"Error generating regex: {str(e)}")
            return Response(
                {"error": "Failed to generate regex pattern"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ApplyRegexView(APIView):
    def post(self, request):
        file_id = request.data.get('file_id')
        regex_pattern = request.data.get('regex')
        replacement_val = request.data.get('replacement', '')
        target_column = request.data.get('column')

        if not file_id or not regex_pattern:
            return Response(
                {"error": "Missing file_id or regex pattern"},
                status=status.HTTP_400_BAD_REQUEST
                )

        try:
            # Load the PREVIOUS file (Chain of custody)
            old_document = get_object_or_404(UploadedDocument, id=file_id)
            old_document.file.open()

            filename = old_document.file.name.lower()

            # Read file
            if filename.endswith('.csv'):
                df = pd.read_csv(old_document.file)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(old_document.file, engine='openpyxl')
            else:
                return Response(
                    {"error": "Unsupported file format"},
                    status=status.HTTP_400_BAD_REQUEST
                    )

            # --- LOGIC TO APPLY TO SPECIFIC COLUMN ---
            if target_column:
                if target_column in df.columns:
                    # Apply ONLY to this column
                    df[target_column] = df[target_column].astype(str).replace(
                        to_replace=regex_pattern,
                        value=replacement_val,
                        regex=True
                    )
                else:
                    # If LLM hallucinated a column name, strictly fail or warn?
                    # For UX, let's fallback to global or return error.
                    # Returning error is safer so user knows it failed.
                    return Response(
                        {"error":
                         f"Column '{target_column}' not found in file"},
                        status=status.HTTP_400_BAD_REQUEST
                        )
            else:
                # Apply Globally
                df = df.astype(str).replace(
                    to_replace=regex_pattern,
                    value=replacement_val,
                    regex=True
                    )

            # Apply Transformation
            df = df.astype(str)
            try:
                df = df.replace(
                    to_replace=regex_pattern,
                    value=replacement_val,
                    regex=True
                    )
            except Exception as e:
                return Response({"error": f"Regex Error: {str(e)}"},
                                status=status.HTTP_400_BAD_REQUEST
                                )

            # AVE AS NEW VERSION (Crucial for Undo)
            buffer = BytesIO()
            new_filename = f"v_edited_{old_document.file.name.split('/')[-1]}"

            if filename.endswith('.csv'):
                df.to_csv(buffer, index=False)
            else:
                df.to_excel(buffer, index=False)

            # Create a NEW database record for this version
            new_document = UploadedDocument.objects.create(
                file=ContentFile(buffer.getvalue(), new_filename)
            )

            # Prepare Response
            # Clean data for JSON
            df = df.replace({'nan': None, 'NaN': None})
            df = df.where(pd.notnull(df), None)

            updated_data = df.head(50).to_dict(orient='records')

            return Response({
                "message": "Replacement applied",
                "data": updated_data,
                "new_file_id": new_document.id  # <- Return new ID to Frontend
            }, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Server Error: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


class DownloadFileView(APIView):
    def get(self, request, file_id):
        try:
            document = get_object_or_404(UploadedDocument, id=file_id)

            # Open the file handle
            file_handle = document.file.open()

            # Determine content type (CSV or Excel)
            filename = document.file.name.split('/')[-1]  # Remove folder paths

            if filename.endswith('.csv'):
                content_type = 'text/csv'

            else:
                content_type = ('application/vnd.'
                                'openxmlformats-officedocument.'
                                'spreadsheetml.sheet')

            # Create the response that forces a download
            response = FileResponse(file_handle, content_type=content_type)
            disposition = f'attachment; filename="{filename}"'
            response['Content-Disposition'] = disposition

            return response

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND
                )


class GenerateFilterView(APIView):
    def post(self, request):
        prompt = request.data.get('prompt')
        data_context = request.data.get('data_context')

        query = LLMService.generate_pandas_filter(prompt, data_context)

        return Response({"filter_query": query}, status=status.HTTP_200_OK)


class ApplyFilterView(APIView):
    def post(self, request):
        file_id = request.data.get('file_id')
        filter_query = request.data.get('filter_query')

        try:
            old_doc = get_object_or_404(UploadedDocument, id=file_id)
            old_doc.file.open()

            # Load Data
            if old_doc.file.name.endswith('.csv'):
                df = pd.read_csv(old_doc.file)
            else:
                df = pd.read_excel(old_doc.file, engine='openpyxl')
            # --- THE TRANSFORMATION: Filtering ---
            # Using query() is safer than exec() but still powerful
            try:
                # Sanitize column names for query if they have spaces
                # (Pandas query requires backticks for spaces, LLM usually
                # handles this, but be aware)
                df_filtered = df.query(filter_query)
            except Exception as e:
                print(f"Filter application error: {str(e)}")
                return Response(
                    {"error": f"Invalid Filter Logic: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                    )

            # --- SAVE NEW VERSION (Reusing your logic) ---
            buffer = BytesIO()
            new_name = f"v_filtered_{old_doc.file.name.split('/')[-1]}"

            if old_doc.file.name.endswith('.csv'):
                df_filtered.to_csv(buffer, index=False)

            else:
                df_filtered.to_excel(buffer, index=False)

            new_doc = UploadedDocument.objects.create(
                file=ContentFile(buffer.getvalue(), new_name)
                )

            # Return Data
            df_filtered = df_filtered.replace(
                {'nan': None, 'NaN': None}
                ).where(pd.notnull(df_filtered), None)

            return Response({
                "message": "Filter applied",
                "data": df_filtered.head(50).to_dict(orient='records'),
                "new_file_id": new_doc.id
            })

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )


class GenerateMathView(APIView):
    def post(self, request):
        prompt = request.data.get('prompt')
        data_context = request.data.get('data_context')

        if not prompt:
            return Response(
                {"error": "Prompt is required"},
                status=status.HTTP_400_BAD_REQUEST
                )

        # Call the new LLM method
        expression = LLMService.generate_math_operation(prompt, data_context)

        return Response({"expression": expression}, status=status.HTTP_200_OK)


class ApplyMathView(APIView):
    def post(self, request):
        file_id = request.data.get('file_id')
        expression = request.data.get('expression')

        if not file_id or not expression:
            return Response(
                {"error": "Missing file_id or expression"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            old_doc = get_object_or_404(UploadedDocument, id=file_id)
            old_doc.file.open()

            # Load Data
            filename = old_doc.file.name.lower()
            if filename.endswith('.csv'):
                df = pd.read_csv(old_doc.file)
            elif filename.endswith(('.xls', '.xlsx')):
                df = pd.read_excel(old_doc.file, engine='openpyxl')
            else:
                return Response(
                    {"error": "Unsupported file"},
                    status=status.HTTP_400_BAD_REQUEST
                    )

            # --- APPLY MATH TRANSFORMATION ---
            try:
                # df.eval() is efficient and handles the column assignment
                # automatically
                # e.g., expression is "`Total` = `Price` * `Qty`"
                # inplace=False returns the modified dataframe
                df = df.eval(expression, inplace=False)
            except Exception as e:
                return Response(
                    {"error": f"Math Operation Failed: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # --- SAVE AS NEW VERSION ---
            buffer = BytesIO()
            new_name = f"v_math_{old_doc.file.name.split('/')[-1]}"

            if filename.endswith('.csv'):
                df.to_csv(buffer, index=False)
            else:
                df.to_excel(buffer, index=False)

            new_doc = UploadedDocument.objects.create(
                file=ContentFile(buffer.getvalue(), new_name)
            )

            # Prepare Preview
            df = df.replace({'nan': None, 'NaN': None})
            df = df.where(pd.notnull(df), None)

            return Response({
                "message": "Math operation applied",
                "data": df.head(50).to_dict(orient='records'),
                "new_file_id": new_doc.id
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
