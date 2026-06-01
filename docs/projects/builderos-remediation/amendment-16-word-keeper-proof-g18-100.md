```prisma
// prisma/schema.prisma

model WordKeeperEntry {
  id        String   @id @default(cuid())
  userId    String   // Assuming userId is a string, e.g., UUID from auth system
  word      String   @db.VarChar(255)
  createdAt DateTime @default(now())
  updated