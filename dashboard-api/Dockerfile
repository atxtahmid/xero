FROM node:20-slim

WORKDIR /app

# Prisma's query engine needs OpenSSL at runtime. node:20-slim is a
# minimal Debian image that doesn't include it, which is exactly what
# caused: "Prisma failed to detect the libssl OpenSSL version to use...
# Defaulting to 'openssl-1.1.x'" in the deploy logs — Prisma was
# guessing, and if that guess doesn't match what's actually on the
# system, the query engine can fail the moment a real query runs (login,
# reading/writing settings), not necessarily at startup. This installs
# it explicitly instead of leaving Prisma to guess.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3001

CMD ["npm", "start"]
