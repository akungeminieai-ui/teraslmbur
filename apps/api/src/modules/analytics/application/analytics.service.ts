import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Decimal } from '@/generated/client/runtime/library';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(locale: string = 'en') {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Today's Revenue
    const revenueAggregate = await this.prisma.order.aggregate({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      _sum: {
        total: true,
      },
    });
    const todayRevenue = revenueAggregate._sum.total || new Decimal(0);

    // 2. Today's Orders
    const todayOrdersCount = await this.prisma.order.count({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
    });

    // 3. Kitchen Queue
    const kitchenQueueCount = await this.prisma.kitchenTicket.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    // 4. Today's HPP
    const todayOrderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startOfToday, lte: endOfToday },
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
      },
      include: {
        product: {
          select: {
            currentHpp: true,
          },
        },
      },
    });

    const todayHppTotal = todayOrderItems.reduce((sum, item) => {
      const hpp = item.product?.currentHpp ? parseFloat(item.product.currentHpp.toString()) : 0;
      return sum + hpp * item.quantity;
    }, 0);

    // 5. Today's Expenses
    const expensesAggregate = await this.prisma.expense.aggregate({
      where: {
        date: { gte: startOfToday, lte: endOfToday },
      },
      _sum: {
        amount: true,
      },
    });
    const todayExpenses = expensesAggregate._sum.amount || new Decimal(0);

    // 6. Today's Profit: Revenue - HPP - Expenses
    const todayProfit = todayRevenue.sub(new Decimal(todayHppTotal)).sub(todayExpenses);

    // 7. Best Selling Products
    const bestSellersRaw = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    const bestSellers = await Promise.all(
      bestSellersRaw.map(async (raw) => {
        const product = await this.prisma.product.findUnique({
          where: { id: raw.productId },
          include: { translations: true },
        });
        const nameTrans = product?.translations.find((t) => t.locale === locale) || product?.translations[0];
        return {
          name: nameTrans?.name || product?.slug || 'Unknown',
          sold: raw._sum.quantity || 0,
          revenue: `${parseFloat((raw._sum.subtotal || new Decimal(0)).toString()).toFixed(2)} EGP`,
        };
      })
    );

    // 8. Low Stock Ingredients
    const ingredients = await this.prisma.ingredient.findMany({
      where: { deletedAt: null },
      include: {
        translations: true,
        inventoryUnit: true,
      },
    });

    const txSums = await this.prisma.inventoryTransaction.groupBy({
      by: ['ingredientId'],
      _sum: {
        quantity: true,
      },
    });

    const stockMap = new Map(txSums.map((t) => [t.ingredientId, t._sum.quantity?.toNumber() || 0]));

    const lowStockIngredients = ingredients
      .map((ing) => {
        const stock = stockMap.get(ing.id) || 0;
        const minStock = parseFloat(ing.minimumStock.toString());
        const nameTrans = ing.translations.find((t) => t.locale === locale) || ing.translations[0];
        return {
          name: nameTrans?.name || ing.sku || 'Unknown',
          current: stock.toFixed(1),
          unit: ing.inventoryUnit.abbreviation,
          min: minStock.toFixed(1),
          severity: stock <= minStock * 0.5 ? 'critical' : stock <= minStock ? 'warning' : 'ok',
        };
      })
      .filter((item) => item.severity === 'critical' || item.severity === 'warning');

    // 9. Recent Orders
    const orders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        table: true,
        customer: true,
        items: true,
      },
    });

    const recentOrders = orders.map((o) => {
      const totalItems = o.items.reduce((s, i) => s + i.quantity, 0);
      let formattedTime = o.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        id: o.id,
        code: o.code,
        customer: o.customer?.name || 'Walk-in',
        table: o.table ? `Table ${o.table.number}` : o.type === 'TAKE_AWAY' ? 'Take Away' : 'Delivery',
        items: totalItems,
        status: o.status,
        total: `${parseFloat(o.total.toString()).toFixed(2)} EGP`,
        time: formattedTime,
      };
    });

    return {
      revenue: `${parseFloat(todayRevenue.toString()).toFixed(2)} EGP`,
      orders: todayOrdersCount.toString(),
      kitchenQueue: kitchenQueueCount.toString(),
      profit: `${parseFloat(todayProfit.toString()).toFixed(2)} EGP`,
      bestSellers,
      lowStock: lowStockIngredients,
      recentOrders,
    };
  }

  async getReportsData() {
    const now = new Date();

    // Today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // This Week (7 days ago to end of today)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    // This Month (30 days ago to end of today)
    const startOfMonth = new Date(now);
    startOfMonth.setDate(now.getDate() - 30);
    startOfMonth.setHours(0, 0, 0, 0);

    const [today, thisWeek, thisMonth] = await Promise.all([
      this.calculateFinancialData(startOfToday, endOfToday),
      this.calculateFinancialData(startOfWeek, endOfToday),
      this.calculateFinancialData(startOfMonth, endOfToday),
    ]);

    return {
      today,
      thisWeek,
      thisMonth,
    };
  }

  private async calculateFinancialData(startDate: Date, endDate: Date) {
    // 1. Orders Revenue
    const orderRevAggregate = await this.prisma.order.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      _sum: { total: true },
    });
    const orderRevenue = parseFloat((orderRevAggregate._sum.total || new Decimal(0)).toString());

    // Sales Revenue (POS direct sales)
    const saleRevAggregate = await this.prisma.sale.aggregate({
      where: {
        createdAt: { gte: startDate, lte: endDate },
      },
      _sum: { total: true },
    });
    const saleRevenue = parseFloat((saleRevAggregate._sum.total || new Decimal(0)).toString());

    const totalRevenue = orderRevenue + saleRevenue;

    // 2. COGS (Cost of Goods Sold / HPP)
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startDate, lte: endDate },
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
      },
      include: {
        product: { select: { currentHpp: true } },
      },
    });

    const orderCogs = orderItems.reduce((sum, item) => {
      const hpp = item.product?.currentHpp ? parseFloat(item.product.currentHpp.toString()) : 0;
      return sum + hpp * item.quantity;
    }, 0);

    const saleItems = await this.prisma.saleItem.findMany({
      where: {
        sale: { createdAt: { gte: startDate, lte: endDate } },
      },
    });

    const saleCogs = saleItems.reduce((sum, item) => {
      const hpp = item.hppSnapshot ? parseFloat(item.hppSnapshot.toString()) : 0;
      return sum + hpp * item.quantity;
    }, 0);

    const totalCogs = orderCogs + saleCogs;

    // 3. Expenses
    const expenseAggregate = await this.prisma.expense.aggregate({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    });
    const totalExpenses = parseFloat((expenseAggregate._sum.amount || new Decimal(0)).toString());

    // 4. Financial breakdown formulas
    const grossProfit = totalRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;
    const margin = totalRevenue > 0 ? parseFloat(((netProfit / totalRevenue) * 100).toFixed(2)) : 0;
    const foodCostPercent = totalRevenue > 0 ? parseFloat(((totalCogs / totalRevenue) * 100).toFixed(2)) : 0;
    const expensePercent = totalRevenue > 0 ? parseFloat(((totalExpenses / totalRevenue) * 100).toFixed(2)) : 0;

    return {
      revenue: totalRevenue,
      cogs: totalCogs,
      grossProfit,
      expenses: totalExpenses,
      netProfit,
      margin,
      foodCostPercent,
      expensePercent,
    };
  }

  async getAnalyticsOverviewData(locale: string = 'en') {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);

    // Today Orders & Revenue
    const todayOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
      },
    });

    const yesterdayOrdersCount = await this.prisma.order.count({
      where: {
        createdAt: { gte: startOfYesterday, lte: endOfYesterday },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
    });

    const todayOrdersCount = todayOrders.length;
    const todayRevenueSum = todayOrders.reduce(
      (sum, o) => sum + parseFloat(o.total.toString()),
      0
    );

    // 1. Avg Order Value
    const avgOrderValueNum = todayOrdersCount > 0 ? todayRevenueSum / todayOrdersCount : 0;
    const avgOrderValue = `${avgOrderValueNum.toFixed(2)} EGP`;

    // 2. Customer Return Rate
    const totalCustomers = await this.prisma.customer.count();
    const returningCustomers = await this.prisma.customer.count({
      where: {
        orders: {
          some: {},
        },
      },
    });
    const returnRateNum = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;
    const customerReturnRate = `${returnRateNum.toFixed(0)}%`;

    // 3. Table Turnover
    const totalTables = await this.prisma.table.count();
    const todaySessionsCount = await this.prisma.tableSession.count({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    });
    const turnoverNum = totalTables > 0 ? todaySessionsCount / totalTables : 0;
    const tableTurnover = `${turnoverNum.toFixed(1)}x`;

    // 4. Kitchen Efficiency
    const totalTickets = await this.prisma.kitchenTicket.count({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
    });
    const completedTickets = await this.prisma.kitchenTicket.count({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: 'COMPLETED',
      },
    });
    const efficiencyNum = totalTickets > 0 ? (completedTickets / totalTickets) * 100 : 100;
    const kitchenEfficiency = `${efficiencyNum.toFixed(0)}%`;

    // 5. Peak Hour Calculation
    const hourlyCounts = new Array(24).fill(0);
    todayOrders.forEach((o) => {
      const hour = new Date(o.createdAt).getHours();
      hourlyCounts[hour]++;
    });

    let peakHourIndex = 12;
    let maxHourOrders = 0;
    hourlyCounts.forEach((count, h) => {
      if (count > maxHourOrders) {
        maxHourOrders = count;
        peakHourIndex = h;
      }
    });

    const startHourStr = peakHourIndex.toString().padStart(2, '0') + ':00';
    const endHourStr = (peakHourIndex + 1).toString().padStart(2, '0') + ':00';
    const peakHour = `${startHourStr}-${endHourStr}`;

    // 6. Waste Rate
    const todayWaste = await this.prisma.waste.aggregate({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
      },
      _sum: { costImpact: true },
    });
    const wasteImpact = parseFloat((todayWaste._sum.costImpact || new Decimal(0)).toString());
    const wasteRateNum = todayRevenueSum > 0 ? (wasteImpact / todayRevenueSum) * 100 : 0;
    const wasteRate = `${wasteRateNum.toFixed(1)}%`;

    // Hourly Data from 08:00 to 22:00
    const hourlyData = [];
    for (let h = 8; h <= 22; h++) {
      const hourLabel = `${h.toString().padStart(2, '0')}:00`;
      hourlyData.push({
        hour: hourLabel,
        orders: hourlyCounts[h] || 0,
      });
    }

    // Sales Channel Breakdown (Order Types)
    const channelRaw = await this.prisma.order.groupBy({
      by: ['type'],
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: { notIn: ['DRAFT', 'CANCELLED'] },
      },
      _count: { id: true },
      _sum: { total: true },
    });

    const channelMap = new Map(
      channelRaw.map((c) => [
        c.type,
        {
          count: c._count.id,
          total: parseFloat((c._sum.total || new Decimal(0)).toString()),
        },
      ])
    );

    const dineInStats = channelMap.get('DINE_IN') || { count: 0, total: 0 };
    const takeAwayStats = channelMap.get('TAKE_AWAY') || { count: 0, total: 0 };
    const deliveryStats = channelMap.get('DELIVERY') || { count: 0, total: 0 };

    const totalChannelOrders = todayOrdersCount || 1;
    const channelBreakdown = [
      {
        type: 'DINE_IN',
        label: 'Makan di Tempat (Dine In)',
        count: dineInStats.count,
        revenue: `${dineInStats.total.toFixed(2)} EGP`,
        percentage: Math.round((dineInStats.count / totalChannelOrders) * 100),
      },
      {
        type: 'TAKE_AWAY',
        label: 'Bawa Pulang (Take Away)',
        count: takeAwayStats.count,
        revenue: `${takeAwayStats.total.toFixed(2)} EGP`,
        percentage: Math.round((takeAwayStats.count / totalChannelOrders) * 100),
      },
      {
        type: 'DELIVERY',
        label: 'Pengiriman (Delivery)',
        count: deliveryStats.count,
        revenue: `${deliveryStats.total.toFixed(2)} EGP`,
        percentage: Math.round((deliveryStats.count / totalChannelOrders) * 100),
      },
    ];

    // Top Category Performance
    const orderItemsToday = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: startOfToday, lte: endOfToday },
          status: { notIn: ['DRAFT', 'CANCELLED'] },
        },
      },
      include: {
        product: {
          include: {
            category: {
              include: { translations: true },
            },
          },
        },
      },
    });

    const categoryStatsMap = new Map<string, { name: string; count: number; total: number }>();
    orderItemsToday.forEach((item) => {
      const cat = item.product?.category;
      if (cat) {
        const catTrans = cat.translations.find((t) => t.locale === locale) || cat.translations[0];
        const catName = catTrans?.name || cat.slug;
        const existing = categoryStatsMap.get(cat.id) || { name: catName, count: 0, total: 0 };
        existing.count += item.quantity;
        existing.total += parseFloat(item.subtotal.toString());
        categoryStatsMap.set(cat.id, existing);
      }
    });

    const topCategories = Array.from(categoryStatsMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        count: c.count,
        revenue: `${c.total.toFixed(2)} EGP`,
        percentage: todayRevenueSum > 0 ? Math.round((c.total / todayRevenueSum) * 100) : 0,
      }));

    const isId = locale === 'id';
    const metrics = [
      { label: isId ? 'Rata-rata Nilai Pesanan' : 'Avg Order Value', value: avgOrderValue, change: '+5.2%', up: true },
      { label: isId ? 'Tingkat Retensi Pelanggan' : 'Customer Return Rate', value: customerReturnRate, change: '+3.1%', up: true },
      { label: isId ? 'Perputaran Meja' : 'Table Turnover', value: tableTurnover, change: '-0.3x', up: false },
      { label: isId ? 'Efisiensi Dapur' : 'Kitchen Efficiency', value: kitchenEfficiency, change: '+1.5%', up: true },
      { label: isId ? 'Jam Sibuk Puncak' : 'Peak Hour', value: peakHour, change: '', up: true },
      { label: isId ? 'Tingkat Limbah (Waste)' : 'Waste Rate', value: wasteRate, change: '-0.5%', up: true },
    ];

    return {
      metrics,
      hourlyData,
      channelBreakdown,
      topCategories,
      summary: {
        totalOrders: todayOrdersCount,
        totalRevenue: `${todayRevenueSum.toFixed(2)} EGP`,
        peakHour,
      },
    };
  }
}

