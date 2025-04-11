# Globetrotter API

Backend API for the Globetrotter geography quiz app.

## Deployment Instructions

### Backend Deployment (Render)

1. Create a new account or log in to [Render](https://render.com/)
2. In the dashboard, click on "New +" and select "Blueprint"
3. Connect your GitHub repository
4. Render will automatically detect the `render.yaml` file and configure your service
5. Click "Apply" to deploy your backend

The API will be available at: `https://globetrotter-api.onrender.com` (or your custom Render URL)

### Frontend Deployment (Vercel)

1. Create a new account or log in to [Vercel](https://vercel.com/)
2. Connect your frontend GitHub repository
3. Configure the environment variables to point to your Render backend URL:
   ```
   REACT_APP_API_URL=https://globetrotter-api.onrender.com
   ```
   (Use the correct environment variable name based on your frontend framework)
4. Click "Deploy" to deploy your frontend

## Local Development

```
npm install
npm run dev
```

Server will run on http://localhost:3001 