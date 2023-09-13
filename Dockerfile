FROM node:16.19

WORKDIR /app

COPY package*.json ./

RUN npm install -f

COPY . .

EXPOSE 8765

CMD ["node", "main.js"]
