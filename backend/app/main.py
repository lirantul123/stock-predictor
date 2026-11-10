from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.db.session import init_db, close_db
from app.api.routes import market_data, predictions
from app.api.websocket import socket_app, price_update_loop, indicator_update_loop, prediction_update_loop
import structlog
import asyncio

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
    logger_factory=structlog.stdlib.LoggerFactory(),
)

background_tasks = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    
    background_tasks.append(asyncio.create_task(price_update_loop()))
    background_tasks.append(asyncio.create_task(indicator_update_loop()))
    background_tasks.append(asyncio.create_task(prediction_update_loop()))
    
    yield
    
    for task in background_tasks:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    
    await close_db()


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market_data.router, prefix=settings.api_prefix)
app.include_router(predictions.router, prefix=settings.api_prefix)
app.include_router(market_data.watchlist_router, prefix=settings.api_prefix)
app.include_router(market_data.health_router, prefix="")

app.mount("/ws", socket_app)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "0.1.0",
        "docs": "/docs",
        "websocket": "/ws",
    }