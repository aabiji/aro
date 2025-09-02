![app banner](frontend/assets/banner-readme.png)
aro helps you *track* your nutrition, exercise, weight, and period

Tech stack:
- Golang + Postgresql backend
- React Native + Expo frontend, Nativewind for styling
- OpenFoodFacts API to search by barcode and text

### Build
Fill out these values in a .env file in the root directory:
```
POSTGRES_USER=TODO!
POSTGRES_PASSWORD=TODO!
POSTGRES_DB=db # same as docker service
JWT_SECRET=TODO!
POSTGRES_HOSTNAME=localhost
APP_PORT=8080
DB_PORT=5432
```

Fill out these values in a .env file in the frontend/ directory:
```
EXPO_PUBLIC_API_URL=<API URL or IP ADDRESS>
EXPO_PUBLIC_SUPPORT_EMAIL=<YOUR EMAIL>
```

Then run:
```bash
# run the backend
sudo docker compose up --build

cd frontend
bunx expo run android # for android
bunx expo start # for web
```
