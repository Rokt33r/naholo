import { uuid } from 'drizzle-orm/pg-core'
import { v7 as uuidv7 } from 'uuid'

export const uuidV7IdColumn = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7())
