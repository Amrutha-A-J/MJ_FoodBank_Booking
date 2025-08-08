# MJ FoodBank Booking

This repository uses Git submodules for the backend and frontend components. After cloning, make sure to pull in the submodules and install their dependencies.

## Clone and initialize submodules

```bash
git clone <repository-url>
cd MJ_FoodBank_Booking
git submodule update --init --recursive
```

## Backend setup (`MJ_FB_Backend`)

Prerequisites:
- Node.js and npm

Install and run:
```bash
cd MJ_FB_Backend
npm install
npm start   # or npm run dev
```

## Frontend setup (`MJ_FB_Frontend`)

Prerequisites:
- Node.js and npm

Install and run:
```bash
cd MJ_FB_Frontend
npm install
npm start   # or npm run dev
```

Refer to the submodule repositories for detailed configuration and environment variables.

### Frontend features

- Includes a reusable `FeedbackSnackbar` component for concise user notifications.

## Deploying to Azure

The repository includes Dockerfiles for both the backend and frontend so the application can be containerized and run in Azure services such as Azure Web App for Containers or Azure Container Apps.

1. Build and push the images to an Azure Container Registry:

```bash
# Backend
cd MJ_FB_Backend
docker build -t <registry>.azurecr.io/mjfb-backend .
docker push <registry>.azurecr.io/mjfb-backend

# Frontend
cd ../MJ_FB_Frontend
docker build -t <registry>.azurecr.io/mjfb-frontend .
docker push <registry>.azurecr.io/mjfb-frontend
```

2. Create Azure resources (Web App or Container App) pointing to the images.

3. Configure the environment variables in the Azure portal using the provided `.env.example` files.

This setup prepares the project so it can be hosted on Azure with containerized services.
