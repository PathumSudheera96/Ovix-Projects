import { prisma } from "@/lib/prisma";

const CACHE_ID = "usd-daily";
const BASE_CURRENCY = "USD";
const COLOMBO_TZ = "Asia/Colombo";

type RatesMap = Record<string, number>;

function normalizeCurrency(value: string) {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : BASE_CURRENCY;
}

function colomboDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: COLOMBO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour"),
  };
}

function asSortableNumber(parts: { year: number; month: number; day: number; hour: number }) {
  return parts.year * 1000000 + parts.month * 10000 + parts.day * 100 + parts.hour;
}

function shouldRefreshAtNoonWindow(lastFetchedAt: Date | null, now = new Date()) {
  if (!lastFetchedAt) return true;

  const nowParts = colomboDateParts(now);
  const lastParts = colomboDateParts(lastFetchedAt);
  const nowValue = asSortableNumber(nowParts);
  const lastValue = asSortableNumber(lastParts);

  const todayNoonValue =
    nowParts.year * 1000000 + nowParts.month * 10000 + nowParts.day * 100 + 12;

  if (nowParts.hour >= 12) {
    return lastValue < todayNoonValue;
  }

  // Before noon, data must be from previous noon or later.
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayParts = colomboDateParts(yesterday);
  const yesterdayNoonValue =
    yesterdayParts.year * 1000000 + yesterdayParts.month * 10000 + yesterdayParts.day * 100 + 12;

  return lastValue < yesterdayNoonValue || lastValue > nowValue;
}

async function fetchUsdRates(): Promise<RatesMap> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch exchange rates.");
  }

  const json = (await response.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };

  if (json.result !== "success" || !json.rates) {
    throw new Error("Exchange rate API returned invalid data.");
  }

  return json.rates;
}

export async function getUsdRates() {
  const cached = await prisma.exchangeRateCache.findUnique({
    where: { id: CACHE_ID },
  });

  const cachedRates =
    cached?.rates && typeof cached.rates === "object"
      ? (cached.rates as RatesMap)
      : null;

  if (cached && cachedRates && !shouldRefreshAtNoonWindow(cached.fetchedAt)) {
    return cachedRates;
  }

  try {
    const freshRates = await fetchUsdRates();
    await prisma.exchangeRateCache.upsert({
      where: { id: CACHE_ID },
      create: {
        id: CACHE_ID,
        base: BASE_CURRENCY,
        rates: freshRates,
        fetchedAt: new Date(),
      },
      update: {
        base: BASE_CURRENCY,
        rates: freshRates,
        fetchedAt: new Date(),
      },
    });
    return freshRates;
  } catch (error) {
    if (cachedRates) {
      return cachedRates;
    }
    throw error;
  }
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
) {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return amount;

  const rates = await getUsdRates();
  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate) {
    return amount;
  }

  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

export async function convertManyToCurrency(
  entries: Array<{ amount: number; currency: string }>,
  toCurrency: string
) {
  const target = normalizeCurrency(toCurrency);
  const rates = await getUsdRates();
  const targetRate = rates[target];

  if (!targetRate) {
    return entries.reduce((sum, entry) => sum + entry.amount, 0);
  }

  return entries.reduce((sum, entry) => {
    const source = normalizeCurrency(entry.currency);
    const sourceRate = rates[source];
    if (!sourceRate) return sum + entry.amount;
    const usdAmount = entry.amount / sourceRate;
    return sum + usdAmount * targetRate;
  }, 0);
}

export function formatCurrency(value: number, currency: string) {
  const code = normalizeCurrency(currency);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: BASE_CURRENCY,
      maximumFractionDigits: 2,
    }).format(value);
  }
}
