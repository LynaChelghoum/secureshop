from fastapi import FastAPI, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import JWTError, jwt
from datetime import datetime, timedelta
import os

app = FastAPI()
security = HTTPBearer()

JWT_SECRET = os.getenv("JWT_SECRET", "fallback-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Fake user database (in-memory)
users_db = {
    "alice": {
        "username": "alice",
        "password": "alice123",  # en clair pour simplifier (mais en vrai bcrypt)
        "role": "user"
    },
    "lyna": {
        "username": "lyna",
        "password": "lyna123",
        "role": "user"
    }
     
}

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def authenticate_user(username: str, password: str):
    user = users_db.get(username)
    if not user or user["password"] != password:
        return None
    return user

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)

@app.post("/login", response_model=Token)
async def login(user: UserLogin):
    db_user = authenticate_user(user.username, user.password)
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.username, "role": db_user["role"]})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/profile")
async def profile(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
        return {"username": payload.get("sub"), "role": payload.get("role")}
    except JWTError:
        raise HTTPException(status_code=403, detail="Invalid token")

@app.get("/health")
async def health():
    return {"status": "user-service OK"}