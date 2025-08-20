from contextlib import contextmanager

from sqlalchemy import create_engine, Boolean, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.types import JSON

engine = create_engine("sqlite:///database.db")
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


@contextmanager
def get_session():
  session = SessionLocal()
  try:
    yield session
  except:
    session.rollback()
    raise
  finally:
    session.close()


def row_to_json(row, exclude=[]):
  return {
    col.name: getattr(row, col.name)
    for col in row.__table__.columns
    if col.name not in exclude
  }


class User(Base):
  __tablename__ = "Users"
  id = Column(Integer, primary_key=True)
  email = Column(String, nullable=False)
  password = Column(String, nullable=False)


class Workout(Base):
  __tablename__ = "Workouts"
  id = Column(Integer, primary_key=True)
  user_id = Column(Integer, nullable=False)
  is_template = Column(Boolean, nullable=False)
  tag = Column(String, nullable=False)  # name or date


class Exercise(Base):
  __tablename__ = "Exercises"
  id = Column(Integer, primary_key=True)
  workout_id = Column(Integer, nullable=False)
  name = Column(String, nullable=False)
  exercise_type = Column(Integer, nullable=False)
  reps = Column(JSON)
  weight = Column(Integer)
  duration = Column(Integer)
  distance = Column(Integer)


class Preference(Base):
  __tablename__ = "Preferences"
  user_id = Column(Integer, primary_key=True)
  use_imperial = Column(Boolean, nullable=False)


Base.metadata.create_all(engine)
