# FridgeFlow — Full Featured (Starter to Ship)
Dinner-in-30 agent that generates a minute-by-minute cooking **timeline** with live **timers** and an **“I’m behind”** adapter.

## Quickstart
```bash
python -m venv .venv
# mac/linux:
source .venv/bin/activate
# windows:
# .\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
# open http://127.0.0.1:8000
```

## Project Layout
```
fridgeflow/
├─ app/
│  ├─ main.py     # FastAPI server, heuristic planner, static serving
│  └─ llm.py      # (Optional) LLM planner stub
├─ frontend/
│  ├─ index.html  # Single-page UI
│  └─ static/
│     ├─ style.css
│     └─ app.js   # timers + “I’m behind” logic
└─ requirements.txt
```

## Optional LLM
Set `OPENAI_API_KEY` and implement your provider in `app/llm.py`. Return the shape:
```json
{
  "dish": "Quick Egg Wraps",
  "steps": [{"label":"Preheat pan","start_offset_sec":0,"duration_sec":180}],
  "substitutions": ["No feta? Use cheddar."]
}
```