from fastapi import FastAPI
from routes.auth.auth import router as auth_router
from fastapi.middleware.cors import CORSMiddleware
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
app.include_router(auth_router)

@app.get("/")
async def root():
    return {
        "message": "AI Code Documentation Tool API is running"
    }

