Our lives move like an arrow through time, twisting and changing course
along the way. In the moment, it's easy to lose track or miss the details
that help us understand ourselves better. That's where Aro comes in.
Aro helps you track the key elements of your health, your nutrition,
exercise, weight, periods and more, so your focus can stay where it belongs,
on you.

Tech stack:
- Golang + Postgresql backend
- React Native + Expo frontend, Nativewind for styling
- OpenFoodFacts API to search by barcode and text

Asset credits:
- https://thenounproject.com/icon/dumbbells-44534/
- https://thenounproject.com/icon/dumbbell-157388/
- https://thenounproject.com/icon/settings-1337547/
- https://thenounproject.com/icon/food-7742389/
- https://www.svgrepo.com/collection/basicons-interface-line-icons/

### Build
Fill out these values in a .env file in the root directory:
```
POSTGRES_USER=TODO!
POSTGRES_PASSWORD=TODO!
POSTGRES_DB=TODO!
JWT_SECRET=TODO!
POSTGRES_HOSTNAME=localhost
APP_PORT=8080
DB_PORT=5432
```

Fill out these values in a .env file in the frontend/ directory:
```
EXPO_PUBLIC_API_URL=<API URL or IP ADDRESS>
```

Then run:
```bash
# run the backend
sudo docker compose up --build

cd frontend
bunx expo run android # for android
bunx expo start # for web
```
