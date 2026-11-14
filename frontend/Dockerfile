# Fase 1: build Angular
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install --silent
COPY . .
RUN npm run build

# Fase 2: nginx servindo a SPA e roteando /api para o backend
FROM nginx:alpine
COPY --from=build /app/dist/app/browser /usr/share/nginx/html
RUN printf 'server {\n\
  listen 80;\n\
  root /usr/share/nginx/html;\n\
  client_max_body_size 220M;\n\
  location /api/ { proxy_pass http://backend:8080; }\n\
  # index sempre fresco\n\
  location = /index.html { add_header Cache-Control "no-cache, must-revalidate"; try_files $uri =404; }\n\
  # js/css sem cache agressivo (build sem hash nos nomes)\n\
  location ~* \\.js$ { add_header Cache-Control "no-cache, must-revalidate"; }\n\
  location ~* \\.css$ { add_header Cache-Control "no-cache, must-revalidate"; }\n\
  location / { try_files $uri $uri/ /index.html; }\n\
}\n' > /etc/nginx/conf.d/default.conf
EXPOSE 80