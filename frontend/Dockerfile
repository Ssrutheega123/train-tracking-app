FROM node:18-alpine
RUN npm install -g serve
WORKDIR /app
COPY public/ ./public/
EXPOSE 3000
CMD ["serve", "-s", "public", "-p", "3000"]
