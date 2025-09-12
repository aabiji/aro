create table if not exists Users (
    ID serial primary key,
    LastModified timestamp not null,
    Deleted boolean not null,
    
    Email text not null,
    Password text not null,

    UseImperial boolean not null,
    ScheduledMeals text[] not null
);

create table if not exists Workouts (
    ID serial primary key,
    LastModified timestamp not null,
    Deleted boolean not null,
    
    UserID int not null,
    IsTemplate boolean not null,
    Tag text not null,

    CONSTRAINT fk_workouts_user FOREIGN KEY(UserID) REFERENCES Users(ID)
);

create table if not exists Exercises (
    ID serial primary key,
    LastModified timestamp not null,
    Deleted boolean not null,
    
    WorkoutID int not null,
    Name text not null,
    ExerciseType int not null,
    Reps int[] not null,
    Weight int not null,
    Duration int not null,
    Distance int not null,

    CONSTRAINT fk_exercises_workout FOREIGN KEY(WorkoutID) REFERENCES Workouts(ID)
);

create table if not exists Records (
    ID serial primary key,
    LastModified timestamp not null,
    Deleted boolean not null,
    
    UserID int not null,
    Type text not null,
    Date text not null,
    Value int,

    CONSTRAINT unique_row UNIQUE (UserID, Type, Date),
    CONSTRAINT fk_records_user FOREIGN KEY(UserID) REFERENCES Users(ID)
);

create table if not exists Food (
    ID serial primary key,

    Name text not null,
    ServingSizes float[] not null,
    ServingSizeUnits text[] not null,

    Calories float not null,
    Protein float not null,
    Carbohydrates float not null,
    Fat float not null,
    Cholesterol float not null,
    Calcium float not null,
    Sodium float not null,
    Magnesium float not null,
    Potassium float not null
);

create table if not exists Meal (
    ID serial primary key,
    LastModified timestamp not null,
    Deleted boolean not null,
    UserID int not null,

    Name text,
    Date text,
    ParentID int,
    FoodID int,
    Servings int,
    ServingIndex int,

    CONSTRAINT fk_meal_user FOREIGN KEY(UserID) REFERENCES Users(ID)
)
