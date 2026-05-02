import os
import json
import asyncio
import logging
from fastapi import FastAPI
import aio_pika

app = FastAPI(title="Notification Service")
logger = logging.getLogger("notification-service")
logging.basicConfig(level=logging.INFO)

RABBITMQ_URL = os.environ.get("RABBITMQ_URL", "amqp://guest:guest@rabbitmq/")
SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")  # injected at runtime via secrets


@app.get("/health")
def health():
    return {"status": "ok", "service": "notification-service"}


async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            event = json.loads(message.body.decode())
            event_type = event.get("type")
            if event_type == "ORDER_CREATED":
                logger.info(
                    "Sending order confirmation for order %s to user %s",
                    event.get("orderId"), event.get("userId")
                )
                # In production: send email via SMTP using SMTP_PASSWORD
            else:
                logger.info("Unknown event type: %s", event_type)
        except Exception as exc:
            logger.error("Failed to process message: %s", exc)


async def consume():
    try:
        connection = await aio_pika.connect_robust(RABBITMQ_URL)
        channel = await connection.channel()
        queue = await channel.declare_queue("order_events", durable=True)
        await queue.consume(process_message)
        logger.info("Notification service consuming from order_events queue")
    except Exception as exc:
        logger.error("RabbitMQ connection failed: %s", exc)


@app.on_event("startup")
async def startup():
    asyncio.create_task(consume())
