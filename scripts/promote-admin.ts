import { db } from '../src/server/db'
import { users, userIdentifiers, adminUsers } from '../src/server/db/schema'
import { eq } from 'drizzle-orm'
import { createInterface } from 'readline'

async function main() {
  const userId = process.argv[2]
  if (!userId) {
    console.error('Usage: npx tsx scripts/promote-admin.ts <user-id>')
    process.exit(1)
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    console.error(`User not found: ${userId}`)
    process.exit(1)
  }

  const identifiers = await db
    .select()
    .from(userIdentifiers)
    .where(eq(userIdentifiers.userId, userId))

  const existing = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.userId, userId))
    .limit(1)

  console.log(`\nUser: ${user.name}`)
  console.log(`ID:   ${user.id}`)
  for (const id of identifiers) {
    console.log(`  ${id.type}: ${id.value}`)
  }
  console.log(`Admin: ${existing.length > 0 ? 'yes' : 'no'}`)

  if (existing.length > 0) {
    console.log('\nAlready an admin.')
    process.exit(0)
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>((resolve) =>
    rl.question('\nPromote to admin? (y/N) ', resolve),
  )
  rl.close()

  if (answer.toLowerCase() !== 'y') {
    console.log('Cancelled.')
    process.exit(0)
  }

  await db.insert(adminUsers).values({ userId })
  console.log('Done. User is now an admin.')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
