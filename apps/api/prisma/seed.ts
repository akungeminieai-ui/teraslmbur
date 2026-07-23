import { PrismaClient, UnitType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Default Outlet with Translations
  const outlet = await prisma.outlet.upsert({
    where: { id: 'default-outlet' },
    update: {},
    create: {
      id: 'default-outlet',
      code: 'TL-MAIN',
      phone: '+201000000000',
      timezone: 'Africa/Cairo',
      currency: 'EGP',
      status: 'ACTIVE',
      translations: {
        createMany: {
          data: [
            { locale: 'en', name: 'Teras Lmbur — Main Branch', address: 'Cairo, Egypt' },
            { locale: 'id', name: 'Teras Lmbur — Cabang Utama', address: 'Kairo, Mesir' }
          ]
        }
      }
    },
  });
  console.log(`🏢 Seeded Outlet: default-outlet`);

  // 2. Define Setting Definitions & Values
  const settingDefinitions = [
    // General
    { key: 'store_name', group: 'general', label: 'Store Name', type: 'string', defaultValue: 'Teras Lmbur', isPublic: true },
    { key: 'store_phone', group: 'general', label: 'Store Phone', type: 'phone', defaultValue: '+201000000000', isPublic: true },
    { key: 'store_email', group: 'general', label: 'Store Email', type: 'email', defaultValue: 'contact@teraslmbur.com', isPublic: true },
    { key: 'store_address', group: 'general', label: 'Store Address', type: 'string', defaultValue: 'Cairo, Egypt', isPublic: true },
    { key: 'currency', group: 'general', label: 'Default Currency', type: 'currency', defaultValue: 'EGP', isPublic: true },
    { key: 'timezone', group: 'general', label: 'Store Timezone', type: 'timezone', defaultValue: 'Africa/Cairo', isPublic: true },
    { key: 'support_contact', group: 'general', label: 'Support Contact', type: 'phone', defaultValue: '+201000000000', isPublic: true },

    // Branding & Theme tokens
    { key: 'brand_name', group: 'branding', label: 'Brand Name', type: 'string', defaultValue: 'Teras Lmbur', isPublic: true },
    { key: 'brand_logo', group: 'branding', label: 'Brand Logo URL', type: 'url', defaultValue: '/logo.png', isPublic: true },
    { key: 'app_logo', group: 'branding', label: 'App Icon URL', type: 'url', defaultValue: '/app-icon.png', isPublic: true },
    { key: 'brand_primary', group: 'branding', label: 'Primary Brand Color', type: 'color', defaultValue: '#F97316', isPublic: true },
    { key: 'brand_secondary', group: 'branding', label: 'Secondary Brand Color', type: 'color', defaultValue: '#18181B', isPublic: true },
    { key: 'brand_accent', group: 'branding', label: 'Accent Brand Color', type: 'color', defaultValue: '#3F3F46', isPublic: true },
    { key: 'brand_success', group: 'branding', label: 'Success Color', type: 'color', defaultValue: '#10B981', isPublic: true },
    { key: 'brand_warning', group: 'branding', label: 'Warning Color', type: 'color', defaultValue: '#F59E0B', isPublic: true },
    { key: 'brand_error', group: 'branding', label: 'Error Color', type: 'color', defaultValue: '#EF4444', isPublic: true },
    { key: 'surface_background', group: 'branding', label: 'Surface Background', type: 'color', defaultValue: '#09090B', isPublic: true },
    { key: 'surface_card', group: 'branding', label: 'Surface Card', type: 'color', defaultValue: '#18181B', isPublic: true },
    { key: 'sidebar_width', group: 'branding', label: 'Sidebar Width', type: 'string', defaultValue: '260px', isPublic: true },
    { key: 'sidebar_background', group: 'branding', label: 'Sidebar Background Color', type: 'color', defaultValue: '#09090B', isPublic: true },
    { key: 'border_radius', group: 'branding', label: 'UI Border Radius', type: 'string', defaultValue: '12px', isPublic: true },
    { key: 'font_heading', group: 'branding', label: 'Heading Font Family', type: 'string', defaultValue: 'Inter', isPublic: true },
    { key: 'font_body', group: 'branding', label: 'Body Font Family', type: 'string', defaultValue: 'Inter', isPublic: true },
    { key: 'shadow_card', group: 'branding', label: 'Card Shadow Depth', type: 'string', defaultValue: '0 4px 6px -1px rgb(0 0 0 / 0.1)', isPublic: true },
    { key: 'animation_speed', group: 'branding', label: 'Micro-Animation Speed', type: 'string', defaultValue: '0.2s', isPublic: true },

    // Business
    { key: 'business_day_start_hour', group: 'business', label: 'Business Day Start Hour', type: 'string', defaultValue: '06:00', isPublic: false },
    { key: 'qr_ordering_domain', group: 'business', label: 'QR Ordering Portal Domain', type: 'url', defaultValue: 'https://order.teraslmbur.com', isPublic: true },

    // Kitchen
    { key: 'kitchen_timeout', group: 'kitchen', label: 'Kitchen Preparation Warning Timeout (mins)', type: 'number', defaultValue: '15', isPublic: false },

    // Finance
    { key: 'default_tax', group: 'finance', label: 'Default Value-Added Tax (%)', type: 'number', defaultValue: '14.00', isPublic: false },
    { key: 'default_service_charge', group: 'finance', label: 'Default Service Charge (%)', type: 'number', defaultValue: '12.00', isPublic: false },

    // Receipt
    { key: 'receipt_footer', group: 'receipt', label: 'Receipt Footer Slogan', type: 'string', defaultValue: 'Thank you for dining with us!', isPublic: true },

    // POS / Sequence formats
    { key: 'sequence_format_order', group: 'pos', label: 'Order Number Pattern Format', type: 'string', defaultValue: 'TL-{OUTLET}-{YYYYMMDD}-{0001}', isPublic: false },
    { key: 'sequence_format_receipt', group: 'pos', label: 'Receipt Number Pattern Format', type: 'string', defaultValue: 'INV-{YYYYMMDD}-{000001}', isPublic: false },
  ];

  for (const def of settingDefinitions) {
    const definition = await prisma.settingDefinition.upsert({
      where: { key: def.key },
      update: {
        group: def.group,
        label: def.label,
        type: def.type,
        defaultValue: def.defaultValue,
        isPublic: def.isPublic,
      },
      create: def,
    });

    // Also seed default value for the default-outlet
    await prisma.settingValue.upsert({
      where: {
        definitionId_outletId: {
          definitionId: definition.id,
          outletId: 'default-outlet',
        },
      },
      update: {},
      create: {
        definitionId: definition.id,
        outletId: 'default-outlet',
        value: def.defaultValue || '',
      },
    });
  }
  console.log(`⚙️ Seeded ${settingDefinitions.length} enterprise configuration registry settings.`);

  // 3. Define Permissions List
  const permissionCodes = [
    { code: 'products.create', module: 'products', action: 'create', description: 'Create products' },
    { code: 'products.read', module: 'products', action: 'read', description: 'View products' },
    { code: 'products.update', module: 'products', action: 'update', description: 'Update products' },
    { code: 'products.delete', module: 'products', action: 'delete', description: 'Delete products' },
    
    { code: 'categories.create', module: 'categories', action: 'create', description: 'Create categories' },
    { code: 'categories.read', module: 'categories', action: 'read', description: 'View categories' },
    { code: 'categories.update', module: 'categories', action: 'update', description: 'Update categories' },
    { code: 'categories.delete', module: 'categories', action: 'delete', description: 'Delete categories' },
    
    { code: 'orders.create', module: 'orders', action: 'create', description: 'Create orders' },
    { code: 'orders.read', module: 'orders', action: 'read', description: 'View orders' },
    { code: 'orders.update', module: 'orders', action: 'update', description: 'Update orders' },
    { code: 'orders.void', module: 'orders', action: 'void', description: 'Void orders' },
    
    { code: 'tables.create', module: 'tables', action: 'create', description: 'Create tables' },
    { code: 'tables.read', module: 'tables', action: 'read', description: 'View tables' },
    { code: 'tables.update', module: 'tables', action: 'update', description: 'Update tables' },
    { code: 'tables.delete', module: 'tables', action: 'delete', description: 'Delete tables' },
    
    { code: 'inventory.read', module: 'inventory', action: 'read', description: 'View stock/ingredients' },
    { code: 'inventory.adjust', module: 'inventory', action: 'adjust', description: 'Adjust stock levels' },
    { code: 'inventory.manage', module: 'inventory', action: 'manage', description: 'Manage suppliers/purchases' },
    
    { code: 'reports.read', module: 'reports', action: 'read', description: 'View financial reports' },
    { code: 'reports.export', module: 'reports', action: 'export', description: 'Export report documents' },
    
    { code: 'users.read', module: 'users', action: 'read', description: 'View users' },
    { code: 'users.manage', module: 'users', action: 'manage', description: 'Add/edit/remove team members' },
    
    { code: 'settings.read', module: 'settings', action: 'read', description: 'View settings' },
    { code: 'settings.update', module: 'settings', action: 'update', description: 'Update system settings' },
    
    { code: 'finance.read', module: 'finance', action: 'read', description: 'View financial details' },
    { code: 'finance.manage', module: 'finance', action: 'manage', description: 'Manage expenses and closings' },
    
    { code: 'kitchen.read', module: 'kitchen', action: 'read', description: 'View kitchen display' },
    { code: 'kitchen.manage', module: 'kitchen', action: 'manage', description: 'Update ticket preparation statuses' },
    
    { code: 'analytics.read', module: 'analytics', action: 'read', description: 'View analytics dashboard' },

    { code: 'variants.create', module: 'variants', action: 'create', description: 'Create variants' },
    { code: 'variants.read', module: 'variants', action: 'read', description: 'View variants' },
    { code: 'variants.update', module: 'variants', action: 'update', description: 'Update variants' },
    { code: 'variants.delete', module: 'variants', action: 'delete', description: 'Delete variants' },

    { code: 'modifiers.create', module: 'modifiers', action: 'create', description: 'Create modifiers' },
    { code: 'modifiers.read', module: 'modifiers', action: 'read', description: 'View modifiers' },
    { code: 'modifiers.update', module: 'modifiers', action: 'update', description: 'Update modifiers' },
    { code: 'modifiers.delete', module: 'modifiers', action: 'delete', description: 'Delete modifiers' },

    { code: 'recipes.create', module: 'recipes', action: 'create', description: 'Create recipes' },
    { code: 'recipes.read', module: 'recipes', action: 'read', description: 'View recipes' },
    { code: 'recipes.update', module: 'recipes', action: 'update', description: 'Update recipes' },
    { code: 'recipes.delete', module: 'recipes', action: 'delete', description: 'Delete recipes' },

    { code: 'sales.create', module: 'sales', action: 'create', description: 'Create sales' },
    { code: 'sales.read', module: 'sales', action: 'read', description: 'View sales' },
  ];

  const seededPermissions: any[] = [];
  for (const perm of permissionCodes) {
    const p = await prisma.permission.upsert({
      where: { code: perm.code },
      update: {},
      create: perm,
    });
    seededPermissions.push(p);
  }
  console.log(`🔐 Seeded ${seededPermissions.length} permissions.`);

  // 4. Seed Roles
  const roles = [
    { name: 'OWNER', description: 'System Owner with full access rights', isSystem: true },
    { name: 'MANAGER', description: 'Outlet Manager supervising operations', isSystem: true },
    { name: 'CASHIER', description: 'Sales and transaction cashier staff', isSystem: true },
    { name: 'KITCHEN', description: 'Kitchen food prep management staff', isSystem: true },
    { name: 'WAITER', description: 'Customer serving waitstaff service', isSystem: true },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData,
    });
  }
  console.log('👥 Seeded default roles.');

  // Helper mapping helper to assign permissions
  const assignPermissions = async (roleName: string, allowedPrefixes: string[]) => {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return;

    const matchedPermissions = seededPermissions.filter((p) =>
      allowedPrefixes.some((prefix) => {
        if (prefix.endsWith('.*')) {
          const mod = prefix.split('.')[0];
          return p.module === mod;
        }
        return p.code === prefix;
      })
    );

    for (const p of matchedPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: p.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: p.id,
        },
      });
    }
  };

  // 5. Populate Permissions per Role
  const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
  if (ownerRole) {
    for (const p of seededPermissions) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: ownerRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: ownerRole.id, permissionId: p.id },
      });
    }
  }

  await assignPermissions('MANAGER', [
    'products.create', 'products.read', 'products.update',
    'categories.create', 'categories.read', 'categories.update',
    'orders.create', 'orders.read', 'orders.update', 'orders.void',
    'tables.create', 'tables.read', 'tables.update',
    'inventory.read', 'inventory.adjust',
    'reports.read', 'reports.export',
    'users.read',
    'settings.read',
    'finance.read',
    'kitchen.read', 'kitchen.manage',
    'analytics.read',
    'variants.create', 'variants.read', 'variants.update', 'variants.delete',
    'modifiers.create', 'modifiers.read', 'modifiers.update', 'modifiers.delete',
    'recipes.create', 'recipes.read', 'recipes.update', 'recipes.delete',
    'sales.create', 'sales.read',
  ]);

  await assignPermissions('CASHIER', [
    'products.read',
    'categories.read',
    'orders.create', 'orders.read', 'orders.update',
    'tables.read', 'tables.update',
    'finance.read',
    'kitchen.read',
    'variants.read',
    'modifiers.read',
    'recipes.read',
    'sales.create',
    'sales.read',
    'analytics.read',
  ]);

  await assignPermissions('KITCHEN', [
    'orders.read',
    'kitchen.read', 'kitchen.manage',
    'inventory.read',
    'variants.read',
    'modifiers.read',
    'recipes.read',
    'sales.read',
  ]);

  await assignPermissions('WAITER', [
    'products.read',
    'categories.read',
    'orders.create', 'orders.read', 'orders.update',
    'tables.read', 'tables.update',
    'kitchen.read',
    'variants.read',
    'modifiers.read',
    'recipes.read',
    'sales.read',
  ]);
  console.log('🔒 Assigned permission mapping to roles.');

  // 6. Seed default Accounts per Role
  const passwordHash = await bcrypt.hash('password123', 10);

  const ownerDbRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
  if (ownerDbRole) {
    const ownerUser = await prisma.user.upsert({
      where: { email: 'owner@teraslmbur.com' },
      update: {},
      create: {
        email: 'owner@teraslmbur.com',
        name: 'Teras Lmbur Owner',
        password: passwordHash,
        roleId: ownerDbRole.id,
        outletId: 'default-outlet',
        isActive: true,
      },
    });
    console.log(`👤 Seeded Default Owner Account: ${ownerUser.email} (pass: password123)`);
  }

  const managerDbRole = await prisma.role.findUnique({ where: { name: 'MANAGER' } });
  if (managerDbRole) {
    const managerUser = await prisma.user.upsert({
      where: { email: 'manager@teraslmbur.com' },
      update: {},
      create: {
        email: 'manager@teraslmbur.com',
        name: 'Teras Lmbur Manager',
        password: passwordHash,
        roleId: managerDbRole.id,
        outletId: 'default-outlet',
        isActive: true,
      },
    });
    console.log(`👤 Seeded Default Manager Account: ${managerUser.email} (pass: password123)`);
  }

  const cashierDbRole = await prisma.role.findUnique({ where: { name: 'CASHIER' } });
  if (cashierDbRole) {
    const cashierUser = await prisma.user.upsert({
      where: { email: 'cashier@teraslmbur.com' },
      update: {},
      create: {
        email: 'cashier@teraslmbur.com',
        name: 'Teras Lmbur Cashier',
        password: passwordHash,
        roleId: cashierDbRole.id,
        outletId: 'default-outlet',
        isActive: true,
      },
    });
    console.log(`👤 Seeded Default Cashier Account: ${cashierUser.email} (pass: password123)`);
  }

  const kitchenDbRole = await prisma.role.findUnique({ where: { name: 'KITCHEN' } });
  if (kitchenDbRole) {
    const kitchenUser = await prisma.user.upsert({
      where: { email: 'kitchen@teraslmbur.com' },
      update: {},
      create: {
        email: 'kitchen@teraslmbur.com',
        name: 'Teras Lmbur Kitchen',
        password: passwordHash,
        roleId: kitchenDbRole.id,
        outletId: 'default-outlet',
        isActive: true,
      },
    });
    console.log(`👤 Seeded Default Kitchen Account: ${kitchenUser.email} (pass: password123)`);
  }

  // 7. Seed master Units
  const units = [
    { name: 'Gram', abbreviation: 'g', type: UnitType.WEIGHT },
    { name: 'Kilogram', abbreviation: 'kg', type: UnitType.WEIGHT },
    { name: 'Liter', abbreviation: 'L', type: UnitType.VOLUME },
    { name: 'Milliliter', abbreviation: 'ml', type: UnitType.VOLUME },
    { name: 'Piece', abbreviation: 'pcs', type: UnitType.COUNT },
    { name: 'Bottle', abbreviation: 'bot', type: UnitType.COUNT },
    { name: 'Pack', abbreviation: 'pack', type: UnitType.PACK },
    { name: 'Box', abbreviation: 'box', type: UnitType.PACK },
    { name: 'Cup', abbreviation: 'cup', type: UnitType.COUNT },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { name: unit.name },
      update: { abbreviation: unit.abbreviation, type: unit.type },
      create: unit,
    });
  }
  console.log('🧪 Seeded inventory unit metrics.');

  // 8. Seed Categories
  const categoriesData = [
    {
      slug: 'coffee',
      icon: 'Coffee',
      sortOrder: 1,
      translations: [
        { locale: 'en', name: 'Coffee' },
        { locale: 'id', name: 'Kopi' }
      ]
    },
    {
      slug: 'non-coffee',
      icon: 'CupSoda',
      sortOrder: 2,
      translations: [
        { locale: 'en', name: 'Non Coffee' },
        { locale: 'id', name: 'Non Kopi' }
      ]
    },
    {
      slug: 'tea',
      icon: 'Cup',
      sortOrder: 3,
      translations: [
        { locale: 'en', name: 'Tea' },
        { locale: 'id', name: 'Teh' }
      ]
    },
    {
      slug: 'dessert',
      icon: 'Cake',
      sortOrder: 4,
      translations: [
        { locale: 'en', name: 'Dessert' },
        { locale: 'id', name: 'Makanan Penutup' }
      ]
    },
    {
      slug: 'snack',
      icon: 'Cookie',
      sortOrder: 5,
      translations: [
        { locale: 'en', name: 'Snack' },
        { locale: 'id', name: 'Makanan Ringan' }
      ]
    }
  ];

  const seededCategories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const createdCat = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { icon: cat.icon, sortOrder: cat.sortOrder, isActive: true },
      create: {
        slug: cat.slug,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        isActive: true,
      }
    });

    seededCategories[cat.slug] = createdCat.id;

    for (const trans of cat.translations) {
      await prisma.categoryTranslation.upsert({
        where: {
          categoryId_locale: {
            categoryId: createdCat.id,
            locale: trans.locale
          }
        },
        update: { name: trans.name },
        create: {
          categoryId: createdCat.id,
          locale: trans.locale,
          name: trans.name
        }
      });
    }
  }
  console.log('📁 Seeded categories.');

  // Find units for ingredients
  const unitKg = await prisma.unit.findFirst({ where: { name: 'Kilogram' } });
  const unitLiter = await prisma.unit.findFirst({ where: { name: 'Liter' } });

  const idKg = unitKg?.id || '';
  const idLiter = unitLiter?.id || '';

  // 9. Seed Ingredients
  const ingredientsData = [
    {
      sku: 'ING-COFFEE-BEAN',
      inventoryUnitId: idKg,
      purchaseUnitId: idKg,
      minimumStock: 10,
      idealStock: 50,
      conversionRatio: 1.0,
      costPerUnit: 250.0, // EGP per kg
      translations: [
        { locale: 'en', name: 'Coffee Bean', description: 'Arabica coffee beans' },
        { locale: 'id', name: 'Biji Kopi', description: 'Biji kopi arabika' }
      ]
    },
    {
      sku: 'ING-MILK',
      inventoryUnitId: idLiter,
      purchaseUnitId: idLiter,
      minimumStock: 20,
      idealStock: 100,
      conversionRatio: 1.0,
      costPerUnit: 30.0, // EGP per L
      translations: [
        { locale: 'en', name: 'Milk', description: 'Fresh milk' },
        { locale: 'id', name: 'Susu', description: 'Susu segar' }
      ]
    },
    {
      sku: 'ING-SUGAR',
      inventoryUnitId: idKg,
      purchaseUnitId: idKg,
      minimumStock: 5,
      idealStock: 25,
      conversionRatio: 1.0,
      costPerUnit: 40.0, // EGP per kg
      translations: [
        { locale: 'en', name: 'Sugar', description: 'Refined sugar' },
        { locale: 'id', name: 'Gula', description: 'Gula pasir' }
      ]
    },
    {
      sku: 'ING-CHOCOLATE',
      inventoryUnitId: idKg,
      purchaseUnitId: idKg,
      minimumStock: 2,
      idealStock: 10,
      conversionRatio: 1.0,
      costPerUnit: 150.0, // EGP per kg
      translations: [
        { locale: 'en', name: 'Chocolate Powder', description: 'Dark chocolate powder' },
        { locale: 'id', name: 'Cokelat Bubuk', description: 'Bubuk cokelat hitam' }
      ]
    },
    {
      sku: 'ING-MATCHA',
      inventoryUnitId: idKg,
      purchaseUnitId: idKg,
      minimumStock: 1,
      idealStock: 5,
      conversionRatio: 1.0,
      costPerUnit: 600.0, // EGP per kg
      translations: [
        { locale: 'en', name: 'Matcha Powder', description: 'Pure green tea powder' },
        { locale: 'id', name: 'Matcha Bubuk', description: 'Teh hijau matcha murni' }
      ]
    }
  ];

  for (const ing of ingredientsData) {
    const createdIng = await prisma.ingredient.upsert({
      where: { sku: ing.sku },
      update: {
        inventoryUnitId: ing.inventoryUnitId,
        purchaseUnitId: ing.purchaseUnitId,
        minimumStock: ing.minimumStock,
        idealStock: ing.idealStock,
        conversionRatio: ing.conversionRatio,
        costPerUnit: ing.costPerUnit,
        isActive: true,
      },
      create: {
        sku: ing.sku,
        inventoryUnitId: ing.inventoryUnitId,
        purchaseUnitId: ing.purchaseUnitId,
        minimumStock: ing.minimumStock,
        idealStock: ing.idealStock,
        conversionRatio: ing.conversionRatio,
        costPerUnit: ing.costPerUnit,
        isActive: true,
      }
    });

    for (const trans of ing.translations) {
      await prisma.ingredientTranslation.upsert({
        where: {
          ingredientId_locale: {
            ingredientId: createdIng.id,
            locale: trans.locale
          }
        },
        update: { name: trans.name, description: trans.description },
        create: {
          ingredientId: createdIng.id,
          locale: trans.locale,
          name: trans.name,
          description: trans.description
        }
      });
    }
  }
  console.log('🌿 Seeded ingredients.');

  // 10. Seed Products
  const productsData = [
    {
      slug: 'cappuccino',
      sku: 'PROD-CAPPUCCINO',
      sellingPrice: 45.0,
      categoryId: seededCategories['coffee'] || '',
      preparationTime: 5,
      translations: [
        { locale: 'en', name: 'Cappuccino', description: 'Espresso with steamed milk foam' },
        { locale: 'id', name: 'Cappuccino', description: 'Espresso dengan busa susu' }
      ]
    },
    {
      slug: 'latte',
      sku: 'PROD-LATTE',
      sellingPrice: 50.0,
      categoryId: seededCategories['coffee'] || '',
      preparationTime: 5,
      translations: [
        { locale: 'en', name: 'Latte', description: 'Classic caffe latte' },
        { locale: 'id', name: 'Latte', description: 'Kopi susu klasik' }
      ]
    },
    {
      slug: 'matcha-latte',
      sku: 'PROD-MATCHA-LATTE',
      sellingPrice: 55.0,
      categoryId: seededCategories['non-coffee'] || '',
      preparationTime: 6,
      translations: [
        { locale: 'en', name: 'Matcha Latte', description: 'Green tea matcha with milk' },
        { locale: 'id', name: 'Matcha Latte', description: 'Teh hijau matcha dengan susu' }
      ]
    },
    {
      slug: 'french-fries',
      sku: 'PROD-FRENCH-FRIES',
      sellingPrice: 35.0,
      categoryId: seededCategories['snack'] || '',
      preparationTime: 8,
      translations: [
        { locale: 'en', name: 'French Fries', description: 'Crispy golden potato fries' },
        { locale: 'id', name: 'Kentang Goreng', description: 'Kentang goreng renyah' }
      ]
    }
  ];

  for (const prod of productsData) {
    const createdProd = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        sku: prod.sku,
        sellingPrice: prod.sellingPrice,
        categoryId: prod.categoryId,
        status: 'ACTIVE',
        availabilityStatus: 'AVAILABLE',
        preparationTime: prod.preparationTime,
      },
      create: {
        slug: prod.slug,
        sku: prod.sku,
        sellingPrice: prod.sellingPrice,
        categoryId: prod.categoryId,
        status: 'ACTIVE',
        availabilityStatus: 'AVAILABLE',
        preparationTime: prod.preparationTime,
      }
    });

    for (const trans of prod.translations) {
      await prisma.productTranslation.upsert({
        where: {
          productId_locale: {
            productId: createdProd.id,
            locale: trans.locale
          }
        },
        update: { name: trans.name, description: trans.description },
        create: {
          productId: createdProd.id,
          locale: trans.locale,
          name: trans.name,
          description: trans.description
        }
      });
    }
  }
  console.log('☕ Seeded products.');

  // 10b. Seed Recipes for seeded products
  console.log('📖 Seeding recipes and calculating HPP...');
  const cappProd = await prisma.product.findFirst({ where: { slug: 'cappuccino' } });
  const latteProd = await prisma.product.findFirst({ where: { slug: 'latte' } });
  const matchaLatteProd = await prisma.product.findFirst({ where: { slug: 'matcha-latte' } });

  const ingCoffee = await prisma.ingredient.findFirst({ where: { sku: 'ING-COFFEE-BEAN' } });
  const ingMilk = await prisma.ingredient.findFirst({ where: { sku: 'ING-MILK' } });
  const ingSugar = await prisma.ingredient.findFirst({ where: { sku: 'ING-SUGAR' } });
  const ingMatcha = await prisma.ingredient.findFirst({ where: { sku: 'ING-MATCHA' } });

  if (cappProd && latteProd && matchaLatteProd && ingCoffee && ingMilk && ingSugar && ingMatcha) {
    // Cappuccino Recipe
    const cappRecipe = await prisma.recipe.upsert({
      where: { productId_version: { productId: cappProd.id, version: 1 } },
      update: { isActive: true },
      create: {
        productId: cappProd.id,
        version: 1,
        isActive: true,
        notes: 'Standard Cappuccino Recipe',
      },
    });

    await prisma.recipeItem.deleteMany({ where: { recipeId: cappRecipe.id } });
    await prisma.recipeItem.createMany({
      data: [
        { recipeId: cappRecipe.id, ingredientId: ingCoffee.id, quantity: new Decimal(0.02) }, // 20g
        { recipeId: cappRecipe.id, ingredientId: ingMilk.id, quantity: new Decimal(0.15) }, // 150ml
        { recipeId: cappRecipe.id, ingredientId: ingSugar.id, quantity: new Decimal(0.01) }, // 10g
      ],
    });

    // Update Cappuccino HPP: (0.02 * 250) + (0.15 * 30) + (0.01 * 40) = 5.0 + 4.5 + 0.4 = 9.9
    await prisma.product.update({
      where: { id: cappProd.id },
      data: { currentHpp: new Decimal(9.9) },
    });

    // Latte Recipe
    const latteRecipe = await prisma.recipe.upsert({
      where: { productId_version: { productId: latteProd.id, version: 1 } },
      update: { isActive: true },
      create: {
        productId: latteProd.id,
        version: 1,
        isActive: true,
        notes: 'Standard Latte Recipe',
      },
    });

    await prisma.recipeItem.deleteMany({ where: { recipeId: latteRecipe.id } });
    await prisma.recipeItem.createMany({
      data: [
        { recipeId: latteRecipe.id, ingredientId: ingCoffee.id, quantity: new Decimal(0.02) }, // 20g
        { recipeId: latteRecipe.id, ingredientId: ingMilk.id, quantity: new Decimal(0.20) }, // 200ml
      ],
    });

    // Update Latte HPP: (0.02 * 250) + (0.20 * 30) = 5.0 + 6.0 = 11.0
    await prisma.product.update({
      where: { id: latteProd.id },
      data: { currentHpp: new Decimal(11.0) },
    });

    // Matcha Latte Recipe
    const matchaRecipe = await prisma.recipe.upsert({
      where: { productId_version: { productId: matchaLatteProd.id, version: 1 } },
      update: { isActive: true },
      create: {
        productId: matchaLatteProd.id,
        version: 1,
        isActive: true,
        notes: 'Standard Matcha Latte Recipe',
      },
    });

    await prisma.recipeItem.deleteMany({ where: { recipeId: matchaRecipe.id } });
    await prisma.recipeItem.createMany({
      data: [
        { recipeId: matchaRecipe.id, ingredientId: ingMatcha.id, quantity: new Decimal(0.01) }, // 10g
        { recipeId: matchaRecipe.id, ingredientId: ingMilk.id, quantity: new Decimal(0.20) }, // 200ml
        { recipeId: matchaRecipe.id, ingredientId: ingSugar.id, quantity: new Decimal(0.015) }, // 15g
      ],
    });

    // Update Matcha Latte HPP: (0.01 * 600) + (0.20 * 30) + (0.015 * 40) = 6.0 + 6.0 + 0.6 = 12.6
    await prisma.product.update({
      where: { id: matchaLatteProd.id },
      data: { currentHpp: new Decimal(12.6) },
    });
  }
  console.log('📖 Seeded recipes & calculated HPP values.');

  // 11. Seed Variant Groups & Options
  console.log('🧬 Seeding reusable variant templates...');
  const sizeGroup = await prisma.variantGroup.upsert({
    where: { id: 'vgroup-size' },
    update: { displayOrder: 0, isActive: true },
    create: {
      id: 'vgroup-size',
      displayOrder: 0,
      isActive: true,
    },
  });

  const sizeGroupTranslations = [
    { locale: 'en', name: 'Size' },
    { locale: 'id', name: 'Ukuran' },
  ];
  for (const trans of sizeGroupTranslations) {
    await prisma.variantGroupTranslation.upsert({
      where: { variantGroupId_locale: { variantGroupId: sizeGroup.id, locale: trans.locale } },
      update: { name: trans.name },
      create: { variantGroupId: sizeGroup.id, locale: trans.locale, name: trans.name },
    });
  }

  const sizeOptions = [
    { id: 'vopt-size-small', displayOrder: 0, translations: [{ locale: 'en', name: 'Small' }, { locale: 'id', name: 'Kecil' }] },
    { id: 'vopt-size-medium', displayOrder: 1, translations: [{ locale: 'en', name: 'Medium' }, { locale: 'id', name: 'Sedang' }] },
    { id: 'vopt-size-large', displayOrder: 2, translations: [{ locale: 'en', name: 'Large' }, { locale: 'id', name: 'Besar' }] },
  ];
  for (const opt of sizeOptions) {
    const createdOpt = await prisma.variantOption.upsert({
      where: { id: opt.id },
      update: { displayOrder: opt.displayOrder },
      create: { id: opt.id, groupId: sizeGroup.id, displayOrder: opt.displayOrder },
    });

    for (const trans of opt.translations) {
      await prisma.variantOptionTranslation.upsert({
        where: { variantOptionId_locale: { variantOptionId: createdOpt.id, locale: trans.locale } },
        update: { name: trans.name },
        create: { variantOptionId: createdOpt.id, locale: trans.locale, name: trans.name },
      });
    }
  }

  // 12. Seed Modifier Groups & Options
  console.log('🍬 Seeding reusable modifier templates...');
  
  const modifierTemplates = [
    {
      id: 'mgroup-sugar',
      isRequired: false,
      minSelect: 0,
      maxSelect: 1,
      displayOrder: 0,
      isActive: true,
      translations: [{ locale: 'en', name: 'Sugar Level' }, { locale: 'id', name: 'Tingkat Gula' }],
      options: [
        { id: 'mopt-sugar-25', priceAdjustment: 0.00, displayOrder: 0, translations: [{ locale: 'en', name: '25%' }, { locale: 'id', name: '25%' }] },
        { id: 'mopt-sugar-50', priceAdjustment: 0.00, displayOrder: 1, translations: [{ locale: 'en', name: '50%' }, { locale: 'id', name: '50%' }] },
        { id: 'mopt-sugar-75', priceAdjustment: 0.00, displayOrder: 2, translations: [{ locale: 'en', name: '75%' }, { locale: 'id', name: '75%' }] },
        { id: 'mopt-sugar-100', priceAdjustment: 0.00, displayOrder: 3, translations: [{ locale: 'en', name: '100%' }, { locale: 'id', name: '100%' }] },
      ],
    },
    {
      id: 'mgroup-ice',
      isRequired: false,
      minSelect: 0,
      maxSelect: 1,
      displayOrder: 1,
      isActive: true,
      translations: [{ locale: 'en', name: 'Ice Level' }, { locale: 'id', name: 'Tingkat Es' }],
      options: [
        { id: 'mopt-ice-no', priceAdjustment: 0.00, displayOrder: 0, translations: [{ locale: 'en', name: 'No Ice' }, { locale: 'id', name: 'Tanpa Es' }] },
        { id: 'mopt-ice-less', priceAdjustment: 0.00, displayOrder: 1, translations: [{ locale: 'en', name: 'Less Ice' }, { locale: 'id', name: 'Sedikit Es' }] },
        { id: 'mopt-ice-normal', priceAdjustment: 0.00, displayOrder: 2, translations: [{ locale: 'en', name: 'Normal Ice' }, { locale: 'id', name: 'Es Normal' }] },
        { id: 'mopt-ice-extra', priceAdjustment: 0.00, displayOrder: 3, translations: [{ locale: 'en', name: 'Extra Ice' }, { locale: 'id', name: 'Ekstra Es' }] },
      ],
    },
    {
      id: 'mgroup-milk',
      isRequired: false,
      minSelect: 0,
      maxSelect: 1,
      displayOrder: 2,
      isActive: true,
      translations: [{ locale: 'en', name: 'Milk Choice' }, { locale: 'id', name: 'Pilihan Susu' }],
      options: [
        { id: 'mopt-milk-regular', priceAdjustment: 0.00, displayOrder: 0, translations: [{ locale: 'en', name: 'Regular' }, { locale: 'id', name: 'Reguler' }] },
        { id: 'mopt-milk-oat', priceAdjustment: 15.00, displayOrder: 1, translations: [{ locale: 'en', name: 'Oat' }, { locale: 'id', name: 'Gandum' }] },
        { id: 'mopt-milk-soy', priceAdjustment: 10.00, displayOrder: 2, translations: [{ locale: 'en', name: 'Soy' }, { locale: 'id', name: 'Kedelai' }] },
        { id: 'mopt-milk-almond', priceAdjustment: 15.00, displayOrder: 3, translations: [{ locale: 'en', name: 'Almond' }, { locale: 'id', name: 'Almon' }] },
      ],
    },
  ];

  for (const group of modifierTemplates) {
    const createdGroup = await prisma.modifierGroup.upsert({
      where: { id: group.id },
      update: {
        isRequired: group.isRequired,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        displayOrder: group.displayOrder,
        isActive: group.isActive,
      },
      create: {
        id: group.id,
        isRequired: group.isRequired,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        displayOrder: group.displayOrder,
        isActive: group.isActive,
      },
    });

    for (const trans of group.translations) {
      await prisma.modifierGroupTranslation.upsert({
        where: { modifierGroupId_locale: { modifierGroupId: createdGroup.id, locale: trans.locale } },
        update: { name: trans.name },
        create: { modifierGroupId: createdGroup.id, locale: trans.locale, name: trans.name },
      });
    }

    for (const opt of group.options) {
      const createdOpt = await prisma.modifierOption.upsert({
        where: { id: opt.id },
        update: {
          priceAdjustment: opt.priceAdjustment,
          displayOrder: opt.displayOrder,
          isActive: true,
        },
        create: {
          id: opt.id,
          groupId: createdGroup.id,
          priceAdjustment: opt.priceAdjustment,
          displayOrder: opt.displayOrder,
          isActive: true,
        },
      });

      for (const trans of opt.translations) {
        await prisma.modifierOptionTranslation.upsert({
          where: { modifierOptionId_locale: { modifierOptionId: createdOpt.id, locale: trans.locale } },
          update: { name: trans.name },
          create: { modifierOptionId: createdOpt.id, locale: trans.locale, name: trans.name },
        });
      }
    }
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
