import database as db
import datetime
import jwt
from jwt import PyJWTError
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import uvicorn
import json


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
  except PyJWTError as err:
    raise HTTPException(status_code=400, detail="Invalid JWT")

  # ensure the user exists
  with db.get_session() as session:
    user = session.query(db.User).filter(db.User.id == user_id).first()
    if user is None:
      raise HTTPException(status_code=404, detail="User not found")

  return user_id


class LoginRequest(BaseModel):
  email: str
  password: str


@app.post("/user/login")
def handle_login(request: LoginRequest):
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


class SignupRequest(LoginRequest):
  name: str
  is_female: bool


@app.post("/user/signup")
def handle_signup(request: SignupRequest):
  with db.get_session() as session:
    user = session.query(db.User).filter(db.User.email == request.email).first()
    if user is not None:
      raise HTTPException(status_code=400, detail="Account already exists")

    new_user = db.User(
      name=request.name,
      email=request.email,
      password=request.password,
    )
    session.add(new_user)
    session.commit()

    pref = db.Preference(
      user_id=new_user.id, is_female=request.is_female, use_imperial=True
    )
    session.add(pref)
    session.commit()

    return {"jwt": create_jwt(new_user.id)}


@app.get("/user/info")
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


@app.post("/workout")
def create_workout(request: WorkoutInfo, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    w = db.Workout(user_id=user_id, is_template=request.is_template, tag=request.tag)
    session.add(w)
    session.commit()

    exercises = []
    for e in request.exercises:
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
    obj = db.row_to_json(w, ["user_id"])
    obj["exercises"] = [db.row_to_json(row, ["workout_id"]) for row in exercises]
    return {"workout": obj}


# get the workout and the associated exercises
def get_workout(user_id, id):
  with db.get_session() as session:
    workout = (
      session.query(db.Workout)
      .filter(db.Workout.user_id == user_id)
      .filter(db.Workout.id == id)
      .first()
    )
    if workout is None:
      return [None, None]
    exercises = session.query(db.Exercise).filter(db.Exercise.workout_id == id).all()
    return [workout, exercises]


@app.delete("/workout")
def delete_workout(id: int, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    workout, exercises = get_workout(user_id, id)
    if workout is None:
      raise HTTPException(status_code=404, detail="Workout not found")

    for exercise in exercises:
      session.delete(exercise)
    session.delete(workout)
    session.commit()
  return {}


@app.put("/workout")
def update_workout(request: WorkoutInfo, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    workout, existing_exercises = get_workout(user_id, request.id)
    if workout is None:
      raise HTTPException(status_code=404, detail="Workout not found")
    workout.tag = request.tag

    existing_exercise_map = {ex.id: ex for ex in existing_exercises}
    incoming_ids = set(e.id for e in request.exercises if e.id is not None)

    # delete any exercises not present in incoming payload
    for existing in existing_exercises:
      if existing.id not in incoming_ids:
        session.delete(existing)

    for e in request.exercises:
      if e.id is not None and e.id in existing_exercise_map:
        # update existing
        existing = existing_exercise_map[e.id]
        for attr in db.Exercise.__mapper__.column_attrs:
          if hasattr(e, attr.key):
            setattr(existing, attr.key, getattr(e, attr.key))
      else:
        # add new exercise
        new_ex = db.Exercise(
          workout_id=workout.id,
          name=e.name,
          exercise_type=e.exercise_type,
          reps=e.reps,
          weight=e.weight,
          duration=e.duration,
          distance=e.distance,
        )
        session.add(new_ex)

    session.commit()
    obj = db.row_to_json(workout, ["user_id"])
    exercises = (
      session.query(db.Exercise).filter(db.Exercise.workout_id == workout.id).all()
    )
    obj["exercises"] = [db.row_to_json(row, ["workout_id"]) for row in exercises]
    print(json.dumps(obj, indent=2))
    print(json.dumps(request.model_dump(), indent=2))
    return {"workout": obj}


if __name__ == "__main__":
  uvicorn.run(app, host="127.0.0.1", port=8080)
