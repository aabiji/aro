import database as db
import datetime
import jwt
from jwt import PyJWTError
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
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
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

VARS = load_env_vars()


def create_jwt(user_id):
  exp = datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(days=60)
  payload = {"sub": str(user_id), "exp": exp}
  encoded = jwt.encode(payload, VARS["JWT_SECRET"], algorithm="HS256")
  return encoded if isinstance(encoded, str) else encoded.decode("utf-8")


# return the user id if a valid jwt, else issue bad response
def get_user_id(authorization: str = Header(None)):
  # extract the user from the json web token in the Authorization header
  if not authorization or not authorization.startswith("Bearer "):
    raise HTTPException(
      status_code=400, detail="Missing or invalid Authorization header"
    )

  user_id = 0
  try:
    token = authorization.split(" ")[1]
    secret = VARS["JWT_SECRET"]
    payload = jwt.decode(token, secret, algorithms="HS256")
    user_id = int(payload["sub"])
  except PyJWTError:
    raise HTTPException(status_code=400, detail="Invalid JWT")

  # ensure the user exists
  with db.get_session() as session:
    user = session.query(db.User).filter(db.User.id == user_id).first()
    if user is None:
      raise HTTPException(status_code=404, detail="Account not found")

  return user_id


class AuthRequest(BaseModel):
  email: str
  password: str


@app.post("/login")
def handle_login(request: AuthRequest):
  with db.get_session() as session:
    user = (
      session.query(db.User)
      .filter(db.User.email == request.email)
      .filter(db.User.password == request.password)
      .first()
    )
    if user is None:
      raise HTTPException(status_code=400, detail="Account not found")
    return {"jwt": create_jwt(user.id)}


@app.post("/signup")
def handle_signup(request: AuthRequest):
  with db.get_session() as session:
    user = session.query(db.User).filter(db.User.email == request.email).first()
    if user is not None:
      raise HTTPException(status_code=400, detail="Account already exists")

    new_user = db.User(email=request.email, password=request.password)
    session.add(new_user)
    session.commit()

    pref = db.Preference(user_id=new_user.id, use_imperial=True)
    session.add(pref)
    session.commit()

    return {"jwt": create_jwt(new_user.id)}


class PrefsRequest(BaseModel):
  use_imperial: bool


@app.post("/user")
def update_user_prefs(request: PrefsRequest, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    prefs = session.query(db.Preference).filter(db.Preference.user_id == user_id)
    prefs.use_imperial = request.use_imperial
    session.commit()


@app.get("/user")
def get_user_data(user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    workouts = []
    workout_rows = session.query(db.Workout).filter(db.Workout.user_id == user_id).all()

    for wrow in workout_rows:
      exercises = (
        session.query(db.Exercise).filter(db.Exercise.workout_id == wrow.id).all()
      )
      obj = db.row_to_json(wrow, ["user_id"])
      obj["exercises"] = [db.row_to_json(row, ["workout_id"]) for row in exercises]
      workouts.append(obj)

    pref = session.query(db.Preference).filter(db.Preference.user_id == user_id).first()
    return {"workouts": workouts, "preferences": db.row_to_json(pref, ["user_id"])}


@app.delete("/user")
def delete_user(user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    # delete the user and their preferences
    session.query(db.User).filter(db.User.id == user_id).delete()
    session.query(db.Preference).filter(db.Preference.user_id == user_id).delete()

    # delete the user's workouts
    workouts = session.query(db.Workout).filter(db.Workout.user_id == user_id).all()
    for workout in workouts:
      session.query(db.Exercise).filter(db.Exercise.workout_id == workout.id).delete()
      session.delete(workout)

    session.commit()


class ExerciseInfo(BaseModel):
  id: int | None
  name: str
  exercise_type: int
  reps: List[int] | None
  weight: int | None
  distance: int | None
  duration: int | None


class WorkoutInfo(BaseModel):
  id: int | None
  exercises: List[ExerciseInfo]
  is_template: bool
  tag: str


def create_workout(session, info, user_id):
  w = db.Workout(user_id=user_id, is_template=info.is_template, tag=info.tag)
  session.add(w)
  session.commit()

  exercises = []
  for e in info.exercises:
    exercise = db.Exercise(
      workout_id=w.id,
      name=e.name,
      exercise_type=e.exercise_type,
      reps=e.reps,
      weight=e.weight,
      duration=e.duration,
      distance=e.distance,
    )
    session.add(exercise)
    exercises.append(exercise)

  session.commit()
  return [w, exercises]


def delete_workout(session, user_id, id):
  workout = (
    session.query(db.Workout)
    .filter(db.Workout.user_id == user_id)
    .filter(db.Workout.id == id)
    .first()
  )
  if workout is None:
    return False

  session.query(db.Exercise).filter(db.Exercise.workout_id == id).delete()
  session.delete(workout)
  session.commit()
  return True


@app.post("/workout")
def create_workout_endpoint(request: WorkoutInfo, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    w, exercises = create_workout(session, request, user_id)
    obj = db.row_to_json(w, ["user_id"])
    obj["exercises"] = [db.row_to_json(row, ["workout_id"]) for row in exercises]
    return {"workout": obj}


@app.delete("/workout")
def delete_workout_endpoint(id: int, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    if not delete_workout(session, user_id, id):
      raise HTTPException(status_code=404, detail="Workout not found")
  return {}


@app.put("/workout")
def update_workout(request: WorkoutInfo, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    if not delete_workout(session, user_id, request.id):
      raise HTTPException(status_code=404, detail="Workout not found")

    w, exercises = create_workout(session, request, user_id)
    obj = db.row_to_json(w, ["user_id"])
    obj["exercises"] = [db.row_to_json(row, ["workout_id"]) for row in exercises]
    return {"workout": obj}


if __name__ == "__main__":
  uvicorn.run(app, host="127.0.0.1", port=8080)
