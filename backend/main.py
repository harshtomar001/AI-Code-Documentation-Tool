from fastapi import FastAPI
from backend.config.settings import settings
from backend.routes.auth.auth import router as auth_router
from backend.routes.jobs.events import router as events_router
from backend.routes.jobs.jobs import router as jobs_router
from backend.routes.jobs.upload import router as upload_router
from backend.routes.jobs.batches import router as batches_router
from starlette.middleware.sessions import SessionMiddleware

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

app.include_router(auth_router)
app.include_router(jobs_router)
app.include_router(events_router)
app.include_router(upload_router)
app.include_router(batches_router)


@app.get("/")
async def root():
    return {"message": "AI Code Documentation Tool API is running"}
