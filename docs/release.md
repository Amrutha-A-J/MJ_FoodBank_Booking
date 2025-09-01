# Release Workflow

The `Release` GitHub Actions workflow builds, tests, and deploys the backend and frontend.

## Triggers
- Pushes to the `main` branch
- Tags that start with `v` (for example, `v1.0.0`)

## Jobs
### build-test
1. Checks out the repository
2. Installs dependencies and runs tests for the backend (`MJ_FB_Backend`) and frontend (`MJ_FB_Frontend`)
3. Builds Docker images for both services using the Git ref name as the tag

### publish-deploy
1. Logs into Azure using `azure/login` and the `AZURE_CREDENTIALS` secret
2. Authenticates to the Azure Container Registry and pushes the images with the same tag
3. Deploys the images to Azure Container Apps

## Required Secrets
Set the following secrets in the repository's **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `AZURE_CREDENTIALS` | Service principal credentials in JSON format for the Azure subscription |
| `REGISTRY_LOGIN_SERVER` | Login server of the Azure Container Registry (e.g., `myregistry.azurecr.io`) |
| `REGISTRY_USERNAME` | Username for the Azure Container Registry |
| `REGISTRY_PASSWORD` | Password for the Azure Container Registry |

## Repository Variables
Define these variables (Settings → Secrets and variables → Actions → Variables) to configure deployment targets:

| Variable | Description |
|----------|-------------|
| `AZURE_RESOURCE_GROUP` | Resource group containing the Container Apps |
| `BACKEND_APP_NAME` | Name of the backend Container App |
| `FRONTEND_APP_NAME` | Name of the frontend Container App |

## Deployment Notes
- Images are tagged with the branch or tag name that triggered the workflow.
- Ensure backend and frontend environment variables are configured in the Azure portal before deploying.
