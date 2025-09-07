
create table if not exists Users (
	ID serial primary key,
	Email text not null,
	Password text not null
);

create table if not exists Workouts (
	ID serial primary key,
	UserID int not null,

    CreatedAt int not null,
	IsTemplate boolean not null,
	Tag text not null,

    CONSTRAINT fk_workouts_user FOREIGN KEY(UserID) REFERENCES Users(ID) ON DELETE CASCADE
);

create table if not exists Exercises (
	ID serial primary key,
	WorkoutID int not null,

	Name text not null,
	ExerciseType int not null,
	Reps int[] not null,
    Weight int not null,
    Duration int not null,
    Distance int not null,

    CONSTRAINT fk_exercises_workout FOREIGN KEY(WorkoutID) REFERENCES Workouts(ID) ON DELETE CASCADE
);

create table if not exists Records (
	ID serial primary key,
	UserID int not null,

	Type text not null,
	Date text not null,
	Value int,

    CONSTRAINT unique_row UNIQUE (UserID, Type, Date),
    CONSTRAINT fk_records_user FOREIGN KEY(UserID) REFERENCES Users(ID) ON DELETE CASCADE
);

create table if not exists Settings (
	ID serial primary key,
	UserID int not null,

	UseImperial boolean not null,

    CONSTRAINT fk_settings_user FOREIGN KEY(UserID) REFERENCES Users(ID) ON DELETE CASCADE
);

create table if not exists Foods (
	ID serial primary key,

	Name text not null unique,
	ServingSize int not null,
	ServingUnit text not null
);

create table if not exists Nutrients (
	ID serial primary key,
	FoodID int not null,

	Name text not null,
	Unit text not null,
	Value float not null,

    CONSTRAINT fk_nutrients_food FOREIGN KEY(FoodID) REFERENCES Foods(ID) ON DELETE CASCADE
);
