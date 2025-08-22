import os
from typing import Dict

class LLMNotConfigured(Exception):
    pass

def plan_with_llm(ingredients: str, time_limit_min: int) -> Dict:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise LLMNotConfigured("OPENAI_API_KEY not set. Use heuristic mode or configure an LLM.")

    # Placeholder: mimic expected output. Replace with your provider call.
    steps = [
        {"label": "Preheat pan", "start_offset_sec": 0, "duration_sec": 180},
        {"label": "Whisk eggs; chop spinach", "start_offset_sec": 0, "duration_sec": 180},
        {"label": "Cook eggs; warm tortillas", "start_offset_sec": 180, "duration_sec": 300},
        {"label": "Assemble wraps; crumble cheese", "start_offset_sec": 480, "duration_sec": 240},
        {"label": "Serve", "start_offset_sec": 720, "duration_sec": 60}
    ]
    return {
        "dish": "Quick Egg & Greens Wraps",
        "steps": steps,
        "substitutions": ["No tortillas? Serve on toast.", "No spinach? Use kale (chopped)."]
    }