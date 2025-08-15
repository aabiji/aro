import datetime
import jwt
from jwt import PyJWTError
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel
import database as db
import uvicorn


def load_env_vars():
  vars = {}
  with open(".env", "r") as file:
    for line in file.readlines():
      if not line.startswith("#"):
        parts = line.strip().replace("\n", "").split("=")
        vars[parts[0]] = parts[1]
  return vars


app = FastAPI()
VARS = load_env_vars()


def create_jwt(user_id):
  exp = datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(days=60)
  payload = {"sub": user_id, "exp": exp}
  encoded = jwt.encode(payload, VARS["JWT_SECRET"], algorithm="HS256")
  return encoded


# return the user id if a valid jwt, else issue bad response
def validate_jwt(authorization: str = Header(None)):
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(
      status_code=400, detail="Missing or invalid Authorization header"
    )

  try:
    token = authorization.split(" ")[1]
    secret = VARS["JWT_SECRET"]
    payload = jwt.decode(token, secret, algorithms="HS256")
    return int(payload["sub"])
  except PyJWTError:
    raise HTTPException(status_code=400, detail="Invalid JWT")


class WorkoutInfo(BaseModel):
  is_template: bool
  name: str


class AuthInfo(BaseModel):
  email: str
  password: str
  name: str | None
  is_female: bool | None


@app.post("/login")
def handle_login(info: AuthInfo):
  with db.get_session() as session:
    user = (
      session.query(db.User)
      .filter(db.User.email == info.email)
      .filter(db.User.password == info.password)
      .first()
    )
    if user is None:
      raise HTTPException(status_code=400, detail="Account not found")
    return {"jwt": create_jwt(user.id)}


@app.post("/signup")
def handle_signup(info: AuthInfo):
  with db.get_session() as session:
    user = session.query(db.User).filter(db.User.email == info.email).first()
    if user is not None:
      raise HTTPException(status_code=400, detail="Account already exists")

    new_user = db.User(
      name=info.name, email=info.email, password=info.password, is_female=info.is_female
    )
    session.add(new_user)
    return {"jwt": create_jwt(new_user.id)}


@app.post("/workouts")
def create_workout(info: WorkoutInfo, user_id: int = Depends(validate_jwt)):
  with db.get_session() as session:
    w = db.Workout(user_id=user_id, is_template=info.is_template, name=info.name)
    session.add(w)
  return {}


if __name__ == "__main__":
  uvicorn.run(app, host="127.0.0.1", port=8080)
