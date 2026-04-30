from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import health, extract, files, agent, projects
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"Starting PaySlip Reader API — env: {settings.ENV}")
    yield
    print("Shutting down")


app = FastAPI(
    title="PaySlip Reader API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(projects.router, prefix="/api/v1")
app.include_router(extract.router, prefix="/api/v1")
app.include_router(files.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")
