import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const cust = await db.user.findFirst({ where: { email: 'qa-customer@perkloop.in' } })
  const biz = await db.business.findFirst({ where: { name: 'Perk Loop Demo Café' } })
  if (!cust || !biz) throw new Error('missing demo entities')
  // name for the greeting
  await db.user.update({ where: { id: cust.id }, data: { name: 'Aarav' } })
  // backfill notifications matching the 4 backdated visits (coherent demo state)
  const existing = await db.notification.count({ where: { userId: cust.id } })
  if (existing === 0) {
    const visits = await db.visit.findMany({ where: { customerId: cust.id, businessId: biz.id }, orderBy: { createdAt: 'asc' } })
    for (const v of visits) {
      await db.notification.create({ data: {
        userId: cust.id, businessId: biz.id, type: 'REWARD_EARNED',
        title: 'Stamp earned at Perk Loop Demo Café',
        body: 'Your visit was recorded — 1 stamp added to your punch card.',
        createdAt: v.createdAt,
      } })
    }
    console.log('backfilled', visits.length, 'notifications')
  } else console.log('notifications already exist:', existing)
  const n = await db.notification.count({ where: { userId: cust.id } })
  console.log('qa-customer name:', (await db.user.findUnique({ where: { id: cust.id } }))?.name, '| notifications:', n)
}
main().finally(() => db.$disconnect())
