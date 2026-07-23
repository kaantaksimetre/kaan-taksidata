FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run lint && npm run build

FROM golang:1.26.3-alpine AS backend-build
WORKDIR /src/backend
RUN apk add --no-cache ca-certificates tzdata
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/*.go ./
COPY --from=frontend-build /src/frontend/dist ./public
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/taksimetre-server .

FROM alpine:3.22
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata && mkdir -p /var/data
COPY --from=backend-build /out/taksimetre-server /app/taksimetre-server
COPY --from=frontend-build /src/frontend/dist /app/public
ENV TAKSIMETRE_PUBLIC_DIR=/app/public
EXPOSE 10000
CMD ["/app/taksimetre-server"]
