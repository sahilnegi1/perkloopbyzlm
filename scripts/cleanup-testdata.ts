import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const KEEP_USERS = ['demo-merchant@perkloop.in', 'qa-customer@perkloop.in']
async function main() {
  const keep = await db.user.findMany({ where: { OR: KEEP_USERS.map(e => ({ email: e })) }, select: { id: true } })
  const keepIds = keep.map(u => u.id)
  const all = await db.user.findMany({ select: { id: true, email: true, phone: true } })
  const doomed = all.filter(u => !keepIds.includes(u.id))
  const doomedIds = doomed.map(u => u.id)
  const e2eBiz = await db.business.findFirst({ where: { name: 'E2E Salon' }, select: { id: true } })

  // 1. visits for test users (no FK cascade)
  const v1 = await db.visit.deleteMany({ where: { customerId: { in: doomedIds } } })
  // 2. audit logs referencing test actors or e2e business
  const a1 = await db.auditLog.deleteMany({ where: { OR: [{ actorId: { in: doomedIds } }, ...(e2eBiz ? [{ businessId: e2eBiz.id }] : [])] } })
  // 3. otp codes for test targets
  const o1 = await db.otpCode.deleteMany({ where: { OR: [
    { target: { endsWith: '@t.in' } }, { target: { endsWith: '@test.in' } },
    { target: { startsWith: 'smoke-' } }, { target: { in: ['9123456781', '9876543210'] } },
  ] } })
  // 4. E2E business (cascades programs/accounts/ledger/visits/txns/rewards/redemptions/feedback/members/outlets)
  let b1 = 0
  if (e2eBiz) { await db.business.delete({ where: { id: e2eBiz.id } }); b1 = 1 }
  // 5. test users (cascades accounts->ledger, redemptions, feedback, notifications, memberships)
  const u1 = await db.user.deleteMany({ where: { id: { in: doomedIds } } })
  console.log(`deleted: business=${b1} users=${u1.count} visits=${v1.count} auditLogs=${a1.count} otpCodes=${o1.count}`)
  // verify remaining state
  const [biz, users, programs, ledger, visits, accounts] = await Promise.all([
    db.business.findMany(), db.user.findMany({ select: { email: true, role: true } }),
    db.loyaltyProgram.count(), db.ledgerEntry.count(), db.visit.count(), db.loyaltyAccount.findMany({ include: { customer: { select: { email: true } } } }),
  ])
  console.log('REMAINING businesses:', biz.map(b => b.name))
  console.log('REMAINING users:', users)
  console.log(`programs=${programs} ledger=${ledger} visits=${visits}`)
  console.log('accounts:', accounts.map(a => ({ email: a.customer.email, points: a.points, stamps: a.stamps })))
}
main().finally(() => db.$disconnect())
