from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

from routers import predict, history, stats
from database import create_tables

app = FastAPI(
    title="GlucoseGuard API",
    description="Diabetes Risk Classification using ML models",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ───────────────────────────────────────────────────────────────────
origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(stats.router,   prefix="/api")


@app.on_event("startup")
async def startup():
    create_tables()


@app.get("/", include_in_schema=False)
async def root():
    return JSONResponse({
        "service": "GlucoseGuard API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "ok",
    })


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}
