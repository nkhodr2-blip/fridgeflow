import os
import json

class LLMNotConfigured(Exception):
    """Raised when LLM mode is selected but we don't have the SDK or API key."""
    pass

# Try to import the OpenAI client
try:
    from openai import OpenAI
except Exception:
    OpenAI = None


def plan_with_llm(ingredients: str, time_limit_min: int):
    """
    Call an LLM to produce a structured cooking plan.
    Returns a dict with: { dish: str, steps: [{label, start_offset_sec, duration_sec}], substitutions: [str, ...] }
    """
    if OpenAI is None or not os.getenv("OPENAI_API_KEY"):
        raise LLMNotConfigured("LLM mode requires OPENAI_API_KEY and the openai package. Set the key and redeploy.")

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    model_name = "gpt-4o-mini"  # change if your account has a different available model

    system = (
        "You are FridgeFlow, a cooking planner. "
        "Return ONLY a compact JSON object with fields: "
        '"dish" (string), '
        '"steps" (array of objects with label,start_offset_sec,duration_sec), '
        '"substitutions" (array of strings). '
        "Total planned time must be <= time_limit_min * 60 seconds. "
        "Keep steps to 4–8 items and parallelize where reasonable (e.g., preheat while chopping). "
        "No markdown or explanations—JSON only."
    )

    user = (
        f"Ingredients: {ingredients}\n"
        f"Time limit (minutes): {time_limit_min}\n\n"
        "Respond strictly in this JSON shape:\n"
        "{\n"
        '  \"dish\": \"STRING\",\n'
        '  \"steps\": [\n'
        '    {\"label\":\"PREP something\",\"start_offset_sec\":0,\"duration_sec\":120},\n'
        '    {\"label\":\"COOK something\",\"start_offset_sec\":120,\"duration_sec\":300}\n'
        "  ],\n"
        '  \"substitutions\": [\"swap1 -> swap2\", \"swapA -> swapB\"]\n'
        "}"
    )

    resp = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        temperature=0.4,
        response_format={"type": "json_object"},
    )

    content = resp.choices[0].message.content
    try:
        data = json.loads(content)
        if "dish" not in data or "steps" not in data or not isinstance(data["steps"], list):
            raise ValueError("Missing or invalid keys in JSON.")
        return data
    except Exception as e:
        # Surface a clear error if model returns something unparsable
        raise RuntimeError(f"LLM returned invalid JSON: {e}")
