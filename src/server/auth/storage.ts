import { eq, and } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { KenmonStorage, KenmonSession, KenmonIdentifier } from 'kenmon'
import * as schema from '@/db/schema'
import {
  KenmonEmailOTP,
  KenmonEmailOTPStorage,
} from '@kenmon/email-otp-authenticator'

// Type for user from database
type User = typeof schema.users.$inferSelect

export class DrizzleStorage implements KenmonStorage<User> {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  // User operations
  async createUser(identifier: KenmonIdentifier, data: any): Promise<User> {
    return await this.db.transaction(async (tx) => {
      // Create user
      const [user] = await tx
        .insert(schema.users)
        .values({
          name: data?.name || 'User',
        })
        .returning()

      // Create identifier
      await tx.insert(schema.userIdentifiers).values({
        userId: user.id,
        type: identifier.type,
        value: identifier.value,
        data: identifier.data,
      })

      return user
    })
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1)

    return user || null
  }

  async getUserByIdentifier(
    identifier: KenmonIdentifier,
  ): Promise<User | null> {
    const [result] = await this.db
      .select({ user: schema.users })
      .from(schema.userIdentifiers)
      .innerJoin(
        schema.users,
        eq(schema.userIdentifiers.userId, schema.users.id),
      )
      .where(
        and(
          eq(schema.userIdentifiers.type, identifier.type),
          eq(schema.userIdentifiers.value, identifier.value),
        ),
      )
      .limit(1)

    return result?.user || null
  }

  // Session operations
  async createSession(data: {
    userId: string
    token: string
    expiresAt: Date
    mfaEnabled: boolean
    mfaVerified: boolean
    ipAddress?: string
    userAgent?: string
  }): Promise<KenmonSession> {
    const now = new Date()
    const [session] = await this.db
      .insert(schema.sessions)
      .values({ ...data, createdAt: now, refreshedAt: now, usedAt: now })
      .returning()

    return {
      ...session,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      invalidatedAt: session.invalidatedAt || undefined,
      mfaEnabled: false,
      mfaVerified: false,
    }
  }

  async getUserAuthInfoByIdentifier(identifier: KenmonIdentifier) {
    const result = await this.db.query.userIdentifiers.findFirst({
      where: (userIdentifiers, { eq, and }) =>
        and(
          eq(userIdentifiers.type, identifier.type),
          eq(userIdentifiers.value, identifier.value),
        ),
      with: {
        user: true,
      },
    })

    if (result == null) {
      return null
    }

    const userId = result.userId

    return {
      userId,
      mfaEnabled: false,
    }
  }

  async getSessionById(sessionId: string): Promise<KenmonSession | null> {
    const [session] = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, sessionId))
      .limit(1)

    if (!session) return null

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      refreshedAt: session.refreshedAt,
      usedAt: session.usedAt,
      invalidated: session.invalidated,
      invalidatedAt: session.invalidatedAt || undefined,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      mfaEnabled: false,
      mfaVerified: false,
    }
  }

  async updateSession(
    sessionId: string,
    data: { expiresAt?: Date; refreshedAt?: Date; usedAt?: Date },
  ): Promise<void> {
    await this.db
      .update(schema.sessions)
      .set({
        expiresAt: data.expiresAt,
        refreshedAt: data.refreshedAt,
        usedAt: data.usedAt,
      })
      .where(eq(schema.sessions.id, sessionId))
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.db
      .update(schema.sessions)
      .set({
        invalidated: true,
        invalidatedAt: new Date(),
      })
      .where(eq(schema.sessions.id, sessionId))
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    const now = new Date()
    await this.db
      .update(schema.sessions)
      .set({
        invalidated: true,
        invalidatedAt: now,
      })
      .where(eq(schema.sessions.userId, userId))
  }

  async enableMfa(userId: string): Promise<void> {}

  async disableMfa(userId: string): Promise<void> {}
}

export class DrizzleEmailOTPStorage implements KenmonEmailOTPStorage {
  constructor(private db: NodePgDatabase<typeof schema>) {}

  async createOTP(
    email: string,
    code: string,
    expiresAt: Date,
    signature: string,
  ): Promise<KenmonEmailOTP> {
    const [otp] = await this.db
      .insert(schema.emailOtps)
      .values({
        email,
        code,
        signature,
        expiresAt,
      })
      .returning()

    return {
      id: otp.id,
      email: otp.email,
      code: otp.code,
      signature: otp.signature,
      expiresAt: otp.expiresAt,
      used: otp.used,
    }
  }

  async getOTPById(id: string): Promise<KenmonEmailOTP | null> {
    const [otp] = await this.db
      .select()
      .from(schema.emailOtps)
      .where(eq(schema.emailOtps.id, id))
      .limit(1)

    if (!otp) return null

    return {
      id: otp.id,
      email: otp.email,
      code: otp.code,
      signature: otp.signature,
      expiresAt: otp.expiresAt,
      used: otp.used,
    }
  }

  async markOTPAsUsed(id: string): Promise<void> {
    await this.db
      .update(schema.emailOtps)
      .set({ used: true })
      .where(eq(schema.emailOtps.id, id))
  }
}
