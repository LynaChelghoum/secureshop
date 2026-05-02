import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Float, Integer
from sqlalchemy.orm import declarative_base, sessionmaker
from typing import List, Optional
import uuid

app = FastAPI(title="Product Service")

DB_URL = os.environ.get("DB_URL", "sqlite:///./product.db")
engine = create_engine(DB_URL)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String)
    price = Column(Float, nullable=False)
    category = Column(String)
    stock = Column(Integer, default=0)


Base.metadata.create_all(engine)


class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    price: float
    category: Optional[str] = "general"
    stock: int = 0


@app.get("/health")
def health():
    return {"status": "ok", "service": "product-service"}


@app.get("/products")
def list_products(category: Optional[str] = None, search: Optional[str] = None):
    db = SessionLocal()
    try:
        query = db.query(Product)
        if category:
            query = query.filter(Product.category == category)
        if search:
            query = query.filter(Product.name.contains(search))
        products = query.all()
        return [{"id": p.id, "name": p.name, "price": p.price,
                 "category": p.category, "stock": p.stock} for p in products]
    finally:
        db.close()


@app.get("/products/{product_id}")
def get_product(product_id: str):
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"id": product.id, "name": product.name, "description": product.description,
                "price": product.price, "category": product.category, "stock": product.stock}
    finally:
        db.close()


@app.post("/products", status_code=201)
def create_product(req: ProductCreate):
    db = SessionLocal()
    try:
        p = Product(id=str(uuid.uuid4()), name=req.name, description=req.description,
                    price=req.price, category=req.category, stock=req.stock)
        db.add(p)
        db.commit()
        return {"message": "Product created", "id": p.id}
    finally:
        db.close()
