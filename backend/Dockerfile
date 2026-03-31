FROM node:20-alpine

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

COPY prisma ./prisma
RUN yarn prisma:generate

COPY . .
RUN rm -f tsconfig.build.tsbuildinfo && yarn build

EXPOSE 3001

CMD ["sh", "-c", "yarn prisma:migrate:deploy && node dist/main.js"]
