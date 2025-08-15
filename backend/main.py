import database as db
import datetime
import jwt
from jwt import PyJWTError
from fastapi import Depends, FastAPI, Header, HTTPException
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
VARS = load_env_vars()


def create_jwt(user_id):
  exp = datetime.datetime.now(tz=datetime.timezone.utc) + datetime.timedelta(days=60)
  payload = {"sub": user_id, "exp": exp}
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


@app.post("/user/create")
def handle_signup(request: SignupRequest):
  with db.get_session() as session:
    user = session.query(db.User).filter(db.User.email == request.email).first()
    if user is not None:
      raise HTTPException(status_code=400, detail="Account already exists")

    new_user = db.User(
      name=request.name,
      email=request.email,
      password=request.password,
      is_female=request.is_female,
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
  exercise_type: str
  reps: List[int] | None
  weight: int | None
  distance: int | None
  duration: int | None


class CreateWorkoutRequest(BaseModel):
  exercises: List[ExerciseInfo]
  is_template: bool
  name: str


@app.post("/workout")
def create_workout(request: CreateWorkoutRequest, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    w = db.Workout(user_id=user_id, is_template=request.is_template, name=request.name)
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
      session.commit()
      exercises.append(exercise)

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


class DeleteWorkoutRequest(BaseModel):
  workout_id: int


@app.delete("/workout")
def delete_workout(request: DeleteWorkoutRequest, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    workout, exercises = get_workout(user_id, request.workout_id)
    if workout is None:
      raise HTTPException(status_code=404, detail="Workout not found")

    for exercise in exercises:
      session.delete(exercise)
    session.delete(workout)
    session.commit()
  return {}


class UpdateWorkoutRequest(BaseModel):
  exercises: List[ExerciseInfo]
  name: str
  workout_id: int


@app.put("/workout")
def update_workout(request: UpdateWorkoutRequest, user_id: int = Depends(get_user_id)):
  with db.get_session() as session:
    workout, existing_exercises = get_workout(user_id, request.workout_id)
    if workout is None:
      raise HTTPException(status_code=404, detail="Workout not found")

    if request.name != workout.name:
      workout.name = request.name

    updated_exercises = {e.id: e for e in request.exercises if e.id is not None}
    for exercise in existing_exercises:
      # delete exercises
      if exercise.id not in updated_exercises:
        session.delete(exercise)
        continue

      # set the columns of the exiting exercises to those of the new exercises
      for attr in db.Exercise.__mapper__.column_attrs:
        new_value = getattr(updated_exercises[exercise.id], attr.key)
        setattr(exercise, attr.key, new_value)

    # add new exercises
    for e in request.exercises:
      if e.id is None:
        new_exercise = db.Exercise(
          workout_id=workout.id,
          name=e.name,
          exercise_type=e.exercise_type,
          reps=e.reps,
          weight=e.weight,
          duration=e.duration,
          distance=e.distance,
        )
        session.add(new_exercise)

    # respond with new workout
    session.commit()
    obj = db.row_to_json(workout, ["user_id"])
    final = (
      session.query(db.Exercise).filter(db.Exercise.workout_id == workout.id).all()
    )
    obj["exercises"] = [db.row_to_json(row, ["workout_id"]) for row in final]
    return {"workout": obj}


if __name__ == "__main__":
  uvicorn.run(app, host="127.0.0.1", port=8080)
