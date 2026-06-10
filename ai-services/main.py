"""
STEP AI Services — FastAPI microservice
Endpoints:
  POST /affect/classify      — AU vector → affect state (ML classifier)
  POST /sentiment/analyse    — Reflection text → valence/arousal/depth
  GET  /health               — Service health check
"""

import os
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import uvicorn

from services.affect_classifier import AffectClassifierML
from services.sentiment_analyser import SentimentAnalyser

# ── App setup ─────────────────────────────────────────────────
app = FastAPI(
    title="STEP AI Services",
    description="Affect classification and NLP analysis for the STEP platform",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ── Auth dependency ───────────────────────────────────────────
API_KEY = os.getenv("API_KEY", "dev-key")

def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

# ── Service singletons ────────────────────────────────────────
classifier = AffectClassifierML()
analyser   = SentimentAnalyser()

# ── Request / Response models ─────────────────────────────────

class AUVector(BaseModel):
    au1:  float = Field(..., ge=0.0, le=1.0)
    au4:  float = Field(..., ge=0.0, le=1.0)
    au6:  float = Field(..., ge=0.0, le=1.0)
    au12: float = Field(..., ge=0.0, le=1.0)
    au20: float = Field(..., ge=0.0, le=1.0)
    au23: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)

class ClassifyRequest(BaseModel):
    session_id: str
    learner_id: str
    au_vector:  AUVector

class ClassifyResponse(BaseModel):
    state:      str
    confidence: float
    model_version: str

class SentimentRequest(BaseModel):
    learner_id:   str
    session_id:   str
    prompt_id:    str
    response_text: str

class SentimentResponse(BaseModel):
    valence:            float
    arousal:            float
    reflection_depth:   str     # 'surface' | 'analytical' | 'critical'
    self_reg_markers:   list[str]
    competency_concepts: list[str]
    score:              float
    feedback_points:    list[str]
    model_version:      str

# ── Routes ────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "step-ai-services"}

@app.post("/affect/classify", response_model=ClassifyResponse,
          dependencies=[Depends(verify_api_key)])
def classify_affect(req: ClassifyRequest):
    result = classifier.classify(req.au_vector.model_dump())
    return ClassifyResponse(**result)

@app.post("/sentiment/analyse", response_model=SentimentResponse,
          dependencies=[Depends(verify_api_key)])
def analyse_sentiment(req: SentimentRequest):
    result = analyser.analyse(req.response_text)
    return SentimentResponse(**result)

# ── Entry point ───────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
