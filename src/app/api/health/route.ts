import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sql } from 'drizzle-orm'

/**
 * Health check endpoint for Docker/ECS health monitoring
 * Returns 200 if the application and database are healthy
 */
export async function GET() {
  try {
    // Check database connectivity
    await db.execute(sql`SELECT 1`)

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
