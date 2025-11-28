# Build stage
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# No runtime stage needed here as we will mount the build output
# to the nginx container using a volume in docker-compose
CMD ["echo", "Frontend build complete"]
