# Imagen del frontend para el modo aula: compila la app y la sirve con Nginx.
# El contexto de construcción es la RAÍZ del repositorio (no frontend/),
# porque el build de Vite copia CREDITS.md desde la raíz al dist.
#
# Etapa 1: compilación
FROM node:20-alpine AS build

# git: @edumind/footer se instala desde un repositorio git.
# bash: lo usa el hook prebuild (capture-previous-assets.sh).
RUN apk add --no-cache git bash

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund

COPY CREDITS.md /app/CREDITS.md
COPY frontend/ ./
# Oculta lo exclusivo de liga.edumind.es (proponer deportes)
ENV VITE_MODO_AULA=true
RUN npm run build

# Etapa 2: servidor estático
FROM nginx:1.27-alpine

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY --from=build /app/frontend/nginx.aula.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
