# Multi-stage Dockerfile for Next.js 16 production deployment
# Optimized for AWS ECS with minimal image size

# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy package files (root + workspace manifests for full workspace-aware install)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/naholo-api/package.json ./packages/naholo-api/
COPY packages/naholo-cli/package.json ./packages/naholo-cli/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false

# Stage 2: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Copy workspace package node_modules (pnpm creates symlinks here during install)
COPY --from=deps /app/packages/naholo-cli/node_modules ./packages/naholo-cli/node_modules
COPY --from=deps /app/packages/naholo-api/node_modules ./packages/naholo-api/node_modules

# Set environment variable for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG DEPLOYMENT_ID
ENV DEPLOYMENT_ID=$DEPLOYMENT_ID

# Public (NEXT_PUBLIC_*) build args — inlined by Next.js during `pnpm build`
ARG NEXT_PUBLIC_BILLING
ENV NEXT_PUBLIC_BILLING=$NEXT_PUBLIC_BILLING
ARG NEXT_PUBLIC_POLAR_PRODUCT_ID
ENV NEXT_PUBLIC_POLAR_PRODUCT_ID=$NEXT_PUBLIC_POLAR_PRODUCT_ID
ARG NEXT_PUBLIC_POLAR_ENVIRONMENT
ENV NEXT_PUBLIC_POLAR_ENVIRONMENT=$NEXT_PUBLIC_POLAR_ENVIRONMENT

# Build the Next.js application
# Note: DATABASE_URL is not needed at build time for Next.js
RUN pnpm build

# Stage 3: Runner
FROM node:22-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/certs ./certs

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port 3000
EXPOSE 3000

# Set port environment variable
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server.js"]
