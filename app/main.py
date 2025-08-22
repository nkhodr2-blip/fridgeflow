from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict
import os, re

from .llm import plan_with_llm, LLMNotConfigured

APP_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(APP_DIR)
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")

app = FastAPI(title="FridgeFlow — Full")

app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_DIR,"static")), name="static")

class PlanRequest(BaseModel):
    ingredients: str
    time_limit_min: int = 30
    mode: str = "heuristic"  # "heuristic" or "llm"

def parse_ingredients(text: str) -> List[str]:
    items = [re.sub(r"\s+", " ", x.strip().lower()) for x in re.split(r"[\n,]", text) if x.strip()]
    return [x for x in items if x]

def guess_dish(ings: List[str]) -> str:
    has_eggs = any("egg" in i for i in ings)
    has_pasta = any(k in i for i in ings for k in ["pasta","spaghetti","noodle","penne","macaroni"])
    has_tortilla = any("tortilla" in i for i in ings)
    has_spinach = any("spinach" in i for i in ings)
    has_chicken = any("chicken" in i for i in ings)
    has_rice = any("rice" in i for i in ings)

    if has_eggs and has_tortilla: return "Quick Egg Wraps"
    if has_eggs and has_spinach:  return "Spinach & Egg Skillet"
    if has_pasta:                 return "Weeknight Pasta"
    if has_chicken and has_rice:  return "One-Pan Chicken & Rice"
    if has_chicken:               return "Pan-Seared Chicken Plate"
    if has_rice:                  return "Fried Rice Remix"
    return "Simple Weeknight Skillet"

def heuristic_plan(ingredients: str, time_limit_min: int) -> Dict:
    ings = parse_ingredients(ingredients)
    dish = guess_dish(ings)
    # Clamp duration 15..90 minutes
    total_sec = max(15, min(90, time_limit_min)) * 60

    # Allocate blocks
    heat = max(120, int(total_sec * 0.10))
    prep = max(240, int(total_sec * 0.30))
    cook1 = max(300, int(total_sec * 0.35))
    cook2 = max(180, int(total_sec * 0.20))
    finish = max(120, total_sec - (heat + prep + cook1 + cook2))

    steps = [
        {"label": "Preheat pan / oven / boil water", "start_offset_sec": 0, "duration_sec": heat},
        {"label": "Wash & prep (chop veg, whisk eggs, measure)", "start_offset_sec": 0, "duration_sec": prep},
        {"label": "Start main cook (protein in pan / pasta water / sauté base)", "start_offset_sec": heat, "duration_sec": cook1},
        {"label": "Parallel task (warm starch / toss salad / set table)", "start_offset_sec": heat + 120, "duration_sec": cook2},
        {"label": "Finish & assemble (taste, season, garnish)", "start_offset_sec": heat + cook1, "duration_sec": finish},
        {"label": "Serve", "start_offset_sec": max(0, total_sec - 60), "duration_sec": 60},
    ]

    subs = []
    if not any("onion" in i for i in ings):  subs.append("No onion? Use shallots or leeks.")
    if not any("garlic" in i for i in ings): subs.append("No garlic? Use garlic powder or extra herbs.")
    if any("spinach" in i for i in ings) and not any("feta" in i for i in ings):
        subs.append("Spinach pairs nicely with feta or parmesan.")
    if any("rice" in i for i in ings) and not any("egg" in i for i in ings):
        subs.append("Fried-rice tip: scramble an egg for protein.")

    return {"dish": dish, "steps": steps, "substitutions": subs}

@app.get("/")
def index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))

@app.post("/api/plan")
def make_plan(req: PlanRequest):
    if req.mode == "llm":
        try:
            return plan_with_llm(req.ingredients, req.time_limit_min)
        except LLMNotConfigured as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LLM error: {e}")
    return heuristic_plan(req.ingredients, req.time_limit_min)