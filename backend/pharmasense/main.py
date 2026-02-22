from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from pharmasense.config import settings
from pharmasense.exceptions import register_exception_handlers
from pharmasense.routers import health, auth, patients, clinicians, visits, prescriptions, ocr, chat, voice, analytics, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="PharmaSense",
    description="Coverage-aware prescription decision engine",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(clinicians.router)
app.include_router(visits.router)
app.include_router(prescriptions.router)
app.include_router(ocr.router)
app.include_router(chat.router)
app.include_router(voice.router)
app.include_router(analytics.router)
app.include_router(admin.router)

static_dir = Path(__file__).parent.parent / "static"
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")
