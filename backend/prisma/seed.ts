import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const TENANT_ID = 'restaurant-desktop-tenant';

  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: {},
    create: {
      id: TENANT_ID,
      name: 'Restaurant associatif',
      slug: 'restaurant-local',
      isActive: true,
    },
  });

  console.log('Tenant créé :', tenant.name);

  // Configurations initiales : équipements HACCP
  const configs = [
    { category: 'EQUIPEMENT_FRIGO', key: 'FRIGO_1', label: 'Frigo 1', order: 1 },
    { category: 'EQUIPEMENT_FRIGO', key: 'FRIGO_2', label: 'Frigo 2', order: 2 },
    { category: 'EQUIPEMENT_FRIGO', key: 'CONGELATEUR', label: 'Congélateur', order: 3 },
  ];

  for (const c of configs) {
    await prisma.configuration.upsert({
      where: { tenantId_category_key: { tenantId: TENANT_ID, category: c.category, key: c.key } },
      update: {},
      create: { ...c, tenantId: TENANT_ID, active: true },
    });
  }

  console.log('Seed terminé.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
