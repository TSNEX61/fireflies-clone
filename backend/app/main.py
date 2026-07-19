from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import meetings, action_items, users, bookmarks, comments, soundbites
from app.models.base import Base
from app.db.session import engine

# Make sure tables are created on start (fallback if alembic isn't run)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Fireflies.ai Clone API",
    description="Backend services for the Fireflies.ai meeting-assistant web application clone.",
    version="1.0.0"
)

# Configure CORS
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(meetings.router, prefix="/api")
app.include_router(action_items.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(bookmarks.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(soundbites.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "app": "Fireflies.ai Clone API",
        "docs": "/docs",
        "version": "1.0.0"
    }
