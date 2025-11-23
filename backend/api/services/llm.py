# api/services/llm.py
import openai
import os

# Initialize OpenAI client
client = openai.OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


class LLMService:
    @staticmethod
    def generate_regex(natural_language_prompt: str) -> str:
        try:
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",  # or "gpt-4"
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a Regex Expert. "
                            "Your task is to translate "
                            "natural language descriptions "
                            "into Python-compatible Regular Expressions. "
                            "Return ONLY the raw regex string. "
                            "Do not return markdown (```), explanations, "
                            "or quotes. "
                            "If the request is impossible, return 'INVALID'."
                        )
                    },
                    {
                        "role": "user",
                        "content": natural_language_prompt
                    }
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
                    regex_pattern.strip("`")
                    .replace("regex\n", "")
                    .replace("python\n", "")
                )

            return regex_pattern

        except Exception as e:
            print(f"LLM Error: {e}")
            raise e
