# Shared multi-stage Dockerfile for every app in this monorepo.
# Builds every app; which one actually runs is picked at container start
# via the APP_NAME environment variable (set per-service in the host's
# dashboard) rather than a Docker build arg, since not every host exposes
# build-arg configuration in its UI.
FROM node:24.17-slim AS build
WORKDIR /usr/src/app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g npm@11.6.2
COPY package*.json ./
COPY nest-cli.json tsconfig.json tsconfig.build.json ./
COPY apps ./apps
COPY libs ./libs
RUN npm ci

RUN npm run build:all

FROM node:24.17-slim AS runtime
ENV NODE_ENV=production
WORKDIR /usr/src/app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
# Read by the /health endpoint to report the running version.
COPY --from=build /usr/src/app/package.json ./package.json
# Prisma's native query engine binary lives next to the generated client
# (apps/<service>/src/generated/prisma), not inside the webpack dist bundle.
COPY --from=build /usr/src/app/apps ./apps

CMD ["sh", "-c", "node dist/apps/${APP_NAME}/main"]
