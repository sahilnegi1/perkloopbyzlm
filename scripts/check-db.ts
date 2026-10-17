import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const visits = await db.visit.findMany({ select: { id: true, customerId: true, businessId: true, source: true, createdAt: true } })
  console.log('visits:', JSON.stringify(visits, null, 1))
}
main().finally(() => db.$disconnect())
