# api/services/llm.py
import openai
import os
import json

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


class LLMService:
    @staticmethod
    def generate_regex(
        natural_language_prompt: str,
        data_context: list = None,
            ) -> dict:

        # Prepare Context
        context_str = ""
        headers = []
        if data_context and len(data_context) > 0:
            context_str = (
                f"Data Headers: {headers}\n"
                f"Sample Data: {str(data_context)}\n"
            )

        # Update System Prompt to request JSON
        system_instruction = (
            "You are a Data Cleaning Assistant. Translate natural language "
            "into a Regex Pattern. "
            "You must ALSO determine which column the user refers to,"
            "based on the provided headers. "
            "Return a valid JSON object with strictly two keys:"
            "'regex' and 'column'. "
            " - 'regex': The Python regex string (e.g. '\\d+'). "
            " - 'column': The exact column name from the provided headers"
            "(string), or null if strictly not specified. "
            "Do NOT return markdown formatting or explanations."
            "Just the JSON string."
            f"\n\nContext:\n{context_str}"
        )

        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": natural_language_prompt}
                ],
                temperature=0.0,  # Keep it deterministic
            )

            regex_pattern = response.choices[0].message.content.strip()

            # Safety cleanup: remove markdown code blocks if the LLM adds them
            if (
                regex_pattern.startswith("```")
                and regex_pattern.endswith("```")
            ):
                regex_pattern = (
                    regex_pattern.replace("regex\n", "")
                    .replace("python\n", "")
                    .replace("json\n", "")
                )

            return json.loads(regex_pattern)

        except json.JSONDecodeError:
            print(f"LLM failed to return JSON: {regex_pattern}")
            # Fallback if LLM creates bad JSON
            return {"regex": regex_pattern, "column": None}

        except Exception as e:
            print(f"LLM Error: {e}")
            raise e

    @staticmethod
    def generate_pandas_filter(
        natural_language_prompt: str,
        data_context: list = None,
            ) -> str:
        # Context is crucial here so LLM knows column names
        # (e.g., "Units Sold" vs "units_sold")
        context_str = ""
        if data_context:
            headers = list(data_context[0].keys())
            context_str = (
                f"Available Columns: {headers}\n"
                f"Sample Row: {str(data_context[0])}"
                )

        system_instruction = (
            "You are a Pandas Dataframe Expert. Translate the user's natural "
            "language request into a Python Pandas query string for the "
            ".query() method. Return ONLY the query string. No code blocks.\n"
            "IMPORTANT RULES:\n"
            "1. If a column name has spaces, you MUST enclose it in backticks "
            "(e.g., `Unit Price` > 10).\n"
            "2. Ensure exact capitalization matching the Available Columns.\n"
            "Example Input: 'Keep rows where Age is over 21' -> "
            "Output: 'Age > 21'.\n"
            "Example Input: 'Remove rows where Order Status is Pending' -> "
            "Output: '`Order Status` != \"Pending\"'"
            f"\n\nContext:\n{context_str}"
        )

        try:
            # Re-use your client initialization
            if not client:
                return "Units_Sold > 5000"  # Mock for testing

            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": natural_language_prompt}
                ],
                temperature=0.0,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Filter Error: {e}")
            return ""

    @staticmethod
    def generate_math_operation(
        natural_language_prompt: str,
        data_context: list = None,
            ) -> str:

        context_str = ""
        cols_with_spaces = []

        if data_context:
            headers = list(data_context[0].keys())
            # Dynamic list of columns requiring backticks
            cols_with_spaces = [h for h in headers if " " in h]

            context_str = (
                f"Available Columns: {headers}\n"
                f"Sample Row: {str(data_context[0])}"
                )

        system_instruction = (
            "You are a Pandas Dataframe Expert. Convert the user's natural "
            "language "
            "math request into a Python Pandas .eval() assignment string. "
            "Return ONLY the assignment string. No code blocks or markdown.\n"
            "CRITICAL SYNTAX RULES:\n"
            "1. If a column name contains spaces, it MUST be wrapped in "
            "backticks"
            "(e.g. `Unit Price`).\n"
            f"2. The following columns HAVE spaces and MUST be backticked: {cols_with_spaces}\n"
            "3. The format must be: NewColumnName = Expression\n"
            "Example: 'Calculate Profit as Revenue minus Cost'\n"
            "Output: 'Profit = Revenue - Cost'\n"
            "Example: 'Calculate Total as Price times Quantity'\n"
            "Output: 'Total = `Unit Price` * `Quantity Sold`'\n"
            f"\n\nContext:\n{context_str}"
        )

        try:
            response = client.chat.completions.create(
                model="gpt-4-turbo",
                messages=[
                    {"role": "system", "content": system_instruction},
                    {"role": "user", "content": natural_language_prompt}
                ],
                temperature=0.0,
            )

            content = response.choices[0].message.content.strip()

            if content.startswith("```"):
                content = content.replace("```python", "").replace("```", "")

            return content.strip()

        except Exception as e:
            print(f"Math Gen Error: {e}")
            return ""
