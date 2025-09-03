![app banner](frontend/assets/banner-readme.png)
aro helps you *track* your nutrition, exercise, weight, and period

TODO:
[  ] Improve the heatmap
[  ] Add weight logging page
[  ] Paginate tagged dates
[  ] Handle deleting tags properly
[  ] Store food info in the database (creating + searching)
[  ] Improve food search api: All results from OpenFoodFacts and manually inserted results should go into our database...
[  ] Add frontend page for food -> list foods, add food, see summary (so weekly view of calorie/nutrient consumption, see if you're hitting/over your goals)
[  ] Add weight page (add entry, graph weight values (daily -- past month, weekly view, monthly view...)) 
[  ] Add theme toggling and revamp the ui
[  ] Look into Stripe integration. 1 week free trial, then 5$ a month (find my card number)
[  ] Read: https://h4x0r.org/futex/, watch https://www.youtube.com/c/BranchEducation

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
