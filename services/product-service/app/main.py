from fastapi import FastAPI

app = FastAPI()

products = [
    {"id": 1, "name": "Laptop", "price": 999.99},
    {"id": 2, "name": "Mouse", "price": 19.99},
]

@app.get("/products")
async def list_products():
    return products

@app.get("/health")
async def health():
    return {"status": "product-service OK"}