from fastapi import FastAPI

from config.settings import settings
from routes.auth.auth import router as auth_router

from starlette.middleware.sessions import SessionMiddleware
from config.settings import settings

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.JWT_SECRET_KEY,
    same_site="lax",
    https_only=False,  # localhost
)

app.include_router(auth_router)

@app.get("/")
async def root():
    return {
        "message": "AI Code Documentation Tool API is running"
    }

