from fastapi import FastAPI
import uvicorn

import sqlite3

connection = sqlite3.connect("database.db")
cursor = connection.cursor()
# cursor.close()

app = FastAPI()

@app.get("/")
def index():
    return { "Hello": "world" }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8080)
