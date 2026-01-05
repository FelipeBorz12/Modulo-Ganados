# Dockerfile
FROM node:20-alpine

# Crear carpeta de trabajo
WORKDIR /app

# Copiar manifests primero para aprovechar cache
COPY package*.json ./

# Instalar dependencias (producción)
RUN npm ci --omit=dev

# Copiar el resto del proyecto
COPY . .

# Asegurar variables típicas
ENV NODE_ENV=production
ENV PORT=3002

# Exponer puerto
EXPOSE 3002

# Arranque
CMD ["npm", "start"]
