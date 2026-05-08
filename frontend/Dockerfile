# ================================
# Stage 1: Builder
# ================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files primero (cache layer eficiente)
COPY package.json package-lock.json ./

# Instalar dependencias (ci es más rápido y estricto que install)
RUN npm ci --frozen-lockfile

# Copiar el resto del código
COPY . .

# Build de producción
RUN npm run build


# ================================
# Stage 2: Runtime limpio
# ★ Solo el dist, sin node_modules ni código fuente
# ================================
FROM alpine:3.19 AS runtime

WORKDIR /app

COPY --from=builder /app/dist ./dist

EXPOSE 3000

# serve es ultra liviano para servir SPAs
RUN apk add --no-cache nodejs npm && npm install -g serve

CMD ["serve", "-s", "dist", "-l", "3000"]