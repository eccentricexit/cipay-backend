FROM node:14

# Add package file
COPY package.json ./
COPY yarn.lock ./
COPY src ./src
COPY tsconfig.json ./tsconfig.json
COPY .env ./.env
COPY .env.example ./.env.example

# Install deps
RUN yarn install

# Expose port 3000
EXPOSE 3000

CMD yarn prod
