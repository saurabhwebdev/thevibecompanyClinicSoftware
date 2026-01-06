"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  CurrencyInfo,
  DEFAULT_CURRENCY,
  getCurrencyFromCountry,
  formatCurrency as formatCurrencyUtil,
  formatCurrencyCompact as formatCurrencyCompactUtil,
  formatCurrencyShort as formatCurrencyShortUtil,
  numberToWords as numberToWordsUtil,
  getCurrencyNames,
} from "@/lib/currency";

interface CurrencyContextType {
  currency: CurrencyInfo;
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
  formatCurrencyCompact: (amount: number) => string;
  formatCurrencyShort: (amount: number) => string;
  numberToWords: (amount: number) => string;
  refreshCurrency: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyInfo>(DEFAULT_CURRENCY);
  const [currencyCode, setCurrencyCode] = useState<string>("INR");
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrency = useCallback(async () => {
    try {
      const res = await fetch("/api/tax-config");
      const data = await res.json();

      if (data.success && data.data?.countryCode) {
        const currencyInfo = getCurrencyFromCountry(data.data.countryCode);
        setCurrency(currencyInfo);
        setCurrencyCode(currencyInfo.code);
      }
    } catch (error) {
      console.error("Failed to fetch currency settings:", error);
      // Keep default currency on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrency();
  }, [fetchCurrency]);

  const formatCurrency = useCallback(
    (amount: number) => formatCurrencyUtil(amount, currency.symbol),
    [currency.symbol]
  );

  const formatCurrencyCompact = useCallback(
    (amount: number) => formatCurrencyCompactUtil(amount, currency.symbol),
    [currency.symbol]
  );

  const formatCurrencyShort = useCallback(
    (amount: number) => formatCurrencyShortUtil(amount, currency.symbol),
    [currency.symbol]
  );

  const numberToWords = useCallback(
    (amount: number) => {
      const names = getCurrencyNames(currencyCode);
      return numberToWordsUtil(amount, names.main, names.sub);
    },
    [currencyCode]
  );

  const refreshCurrency = useCallback(async () => {
    setIsLoading(true);
    await fetchCurrency();
  }, [fetchCurrency]);

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        isLoading,
        formatCurrency,
        formatCurrencyCompact,
        formatCurrencyShort,
        numberToWords,
        refreshCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}

// Hook for components that need to handle loading state
export function useCurrencyWithLoading() {
  const context = useCurrency();
  return {
    ...context,
    // Return a safe format function that works even during loading
    safeFormatCurrency: (amount: number) => {
      if (context.isLoading) {
        return formatCurrencyUtil(amount, DEFAULT_CURRENCY.symbol);
      }
      return context.formatCurrency(amount);
    },
  };
}
