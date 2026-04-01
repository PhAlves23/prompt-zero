FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

COPY prisma ./prisma
RUN yarn prisma:generate

COPY . .
RUN rm -f tsconfig.build.tsbuildinfo && yarn build && echo "✅ Build completed" && ls -la dist/ | head -20

EXPOSE 3001

# Use exec form and add explicit error handling
CMD sh -c "yarn prisma:migrate:deploy && echo '✅ Migrations completed, starting application...' && node dist/main.js || (echo '❌ Application failed to start' && exit 1)"
