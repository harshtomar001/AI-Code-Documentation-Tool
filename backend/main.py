from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from config.settings import settings
from routes.auth.auth import router as auth_router
from routes.github import router as github_router
from routes.projects import router as projects_router

# Core AI job system
from routes.jobs.events import router as events_router
from routes.jobs.jobs import router as jobs_router
from routes.jobs.upload import router as upload_router
from routes.jobs.batches import router as batches_router


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
)


app.add_middleware(
    SessionMiddleware,
    secret_key=settings.JWT_SECRET_KEY,
    same_site="lax",
    https_only=False,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication
app.include_router(auth_router)

# GitHub integration
app.include_router(github_router)

# Projects
app.include_router(projects_router)

# Core AI job system
app.include_router(jobs_router)
app.include_router(events_router)
app.include_router(upload_router)
app.include_router(batches_router)


@app.get("/")
async def root():
    return {
        "message": "AI Code Documentation Tool API is running"
    }
