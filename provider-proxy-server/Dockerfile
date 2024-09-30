FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3040
ENV PORT=3040
CMD ["npm", "run", "start"]
