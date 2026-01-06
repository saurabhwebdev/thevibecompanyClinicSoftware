// Currency utility functions
import { getCountryConfig } from "@/lib/tax/countries";

export interface CurrencyInfo {
  code: string;
  symbol: string;
}

// Default currency (fallback)
export const DEFAULT_CURRENCY: CurrencyInfo = {
  code: "INR",
  symbol: "₹",
};

// Get currency info from country code
export function getCurrencyFromCountry(countryCode: string): CurrencyInfo {
  const config = getCountryConfig(countryCode);
  if (config) {
    return {
      code: config.currencyCode,
      symbol: config.currencySymbol,
    };
  }
  return DEFAULT_CURRENCY;
}

// Format currency with symbol
export function formatCurrency(
  amount: number,
  symbol: string = DEFAULT_CURRENCY.symbol
): string {
  // Handle negative amounts
  if (amount < 0) {
    return `-${symbol}${Math.abs(amount).toFixed(2)}`;
  }
  return `${symbol}${amount.toFixed(2)}`;
}

// Format currency without decimals (for display)
export function formatCurrencyCompact(
  amount: number,
  symbol: string = DEFAULT_CURRENCY.symbol
): string {
  if (amount < 0) {
    return `-${symbol}${Math.abs(amount).toLocaleString()}`;
  }
  return `${symbol}${amount.toLocaleString()}`;
}

// Format currency with K/L/Cr suffixes (Indian number system)
export function formatCurrencyShort(
  amount: number,
  symbol: string = DEFAULT_CURRENCY.symbol
): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 10000000) {
    return `${sign}${symbol}${(absAmount / 10000000).toFixed(1)}Cr`;
  }
  if (absAmount >= 100000) {
    return `${sign}${symbol}${(absAmount / 100000).toFixed(1)}L`;
  }
  if (absAmount >= 1000) {
    return `${sign}${symbol}${(absAmount / 1000).toFixed(1)}K`;
  }
  return `${sign}${symbol}${absAmount.toFixed(2)}`;
}

// Number to words conversion (supports multiple currencies)
export function numberToWords(
  num: number,
  currencyName: string = "Rupees",
  subunitName: string = "Paise"
): string {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  const numToWord = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100)
      return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000)
      return (
        ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + numToWord(n % 100) : "")
      );
    if (n < 100000)
      return (
        numToWord(Math.floor(n / 1000)) +
        " Thousand" +
        (n % 1000 ? " " + numToWord(n % 1000) : "")
      );
    if (n < 10000000)
      return (
        numToWord(Math.floor(n / 100000)) +
        " Lakh" +
        (n % 100000 ? " " + numToWord(n % 100000) : "")
      );
    return (
      numToWord(Math.floor(n / 10000000)) +
      " Crore" +
      (n % 10000000 ? " " + numToWord(n % 10000000) : "")
    );
  };

  const mainUnit = Math.floor(num);
  const subUnit = Math.round((num - mainUnit) * 100);

  let result = numToWord(mainUnit) + " " + currencyName;
  if (subUnit > 0) {
    result += " and " + numToWord(subUnit) + " " + subunitName;
  }
  return result + " Only";
}

// Currency names and subunits for different countries
export const CURRENCY_NAMES: Record<
  string,
  { main: string; sub: string }
> = {
  INR: { main: "Rupees", sub: "Paise" },
  AED: { main: "Dirhams", sub: "Fils" },
  PHP: { main: "Pesos", sub: "Centavos" },
  KES: { main: "Shillings", sub: "Cents" },
  USD: { main: "Dollars", sub: "Cents" },
  EUR: { main: "Euros", sub: "Cents" },
  GBP: { main: "Pounds", sub: "Pence" },
};

// Get currency names for a currency code
export function getCurrencyNames(currencyCode: string): { main: string; sub: string } {
  return CURRENCY_NAMES[currencyCode] || { main: "Units", sub: "Subunits" };
}
