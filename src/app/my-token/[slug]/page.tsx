"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import {
  Clock,
  Search,
  Hash,
  User,
  Stethoscope,
  CalendarDays,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TokenInfo {
  appointmentId: string;
  tokenNumber: number | null;
  tokenDisplayNumber: string | null;
  status: string;
  appointmentDate: string;
  startTime: string;
  patientName: string;
  doctorName: string;
  estimatedWaitMinutes: number | null;
  checkedInAt: string | null;
  queuePosition: number | null;
  currentServingToken: string | null;
}

export default function MyTokenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [searchQuery, setSearchQuery] = useState("");
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const lookupToken = useCallback(async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const isToken = query.toUpperCase().startsWith("T-");
      const param = isToken ? `token=${query}` : `appointmentId=${query}`;

      const response = await fetch(`/api/public/token-lookup?slug=${slug}&${param}`);
      const result = await response.json();

      if (result.success) {
        setTokenInfo(result.data);
        setLastRefresh(new Date());
      } else {
        setError(result.error || "Token not found");
        setTokenInfo(null);
      }
    } catch {
      setError("Failed to lookup token. Please try again.");
      setTokenInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  const refreshStatus = useCallback(() => {
    if (tokenInfo?.tokenDisplayNumber) {
      lookupToken(tokenInfo.tokenDisplayNumber);
    } else if (tokenInfo?.appointmentId) {
      lookupToken(tokenInfo.appointmentId);
    }
  }, [tokenInfo, lookupToken]);

  // Auto-refresh every 30 seconds if checked in
  useEffect(() => {
    if (tokenInfo?.status === "checked-in") {
      const interval = setInterval(refreshStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [tokenInfo?.status, refreshStatus]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: "bg-gray-500",
      confirmed: "bg-blue-500",
      "checked-in": "bg-yellow-500",
      "in-progress": "bg-green-500",
      completed: "bg-purple-500",
      cancelled: "bg-red-500",
      "no-show": "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">My Token Status</h1>
          <p className="text-gray-600">Check your appointment token and queue position</p>
        </motion.div>

        {/* Search Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Enter token (T-001) or appointment ID"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && lookupToken(searchQuery)}
                    className="pl-9"
                  />
                </div>
                <Button onClick={() => lookupToken(searchQuery)} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Token Info Card */}
        <AnimatePresence>
          {tokenInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Token Display */}
              {tokenInfo.tokenDisplayNumber && (
                <Card className="mb-6 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white">
                    <p className="text-sm opacity-80 mb-2">Your Token Number</p>
                    <motion.div
                      className="text-7xl font-black font-mono tracking-wider"
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {tokenInfo.tokenDisplayNumber}
                    </motion.div>
                    <Badge
                      className={`mt-4 ${getStatusColor(tokenInfo.status)} text-white border-0`}
                    >
                      {tokenInfo.status.replace("-", " ").toUpperCase()}
                    </Badge>
                  </div>
                </Card>
              )}

              {/* Queue Position */}
              {tokenInfo.status === "checked-in" && tokenInfo.queuePosition && (
                <Card className="mb-6">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-600 mb-1">Queue Position</p>
                        <p className="text-3xl font-bold text-blue-700">#{tokenInfo.queuePosition}</p>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 mb-1">Est. Wait Time</p>
                        <p className="text-3xl font-bold text-green-700">
                          {tokenInfo.estimatedWaitMinutes || 0} min
                        </p>
                      </div>
                    </div>
                    {tokenInfo.currentServingToken && (
                      <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-center">
                        <p className="text-sm text-yellow-700">
                          Now Serving: <span className="font-bold">{tokenInfo.currentServingToken}</span>
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Appointment Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarDays className="h-5 w-5" />
                    Appointment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Appointment ID</p>
                      <p className="font-medium">{tokenInfo.appointmentId}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Patient</p>
                      <p className="font-medium">{tokenInfo.patientName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Stethoscope className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Doctor</p>
                      <p className="font-medium">Dr. {tokenInfo.doctorName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled Time</p>
                      <p className="font-medium">
                        {format(new Date(tokenInfo.appointmentDate), "MMM dd, yyyy")} at {tokenInfo.startTime}
                      </p>
                    </div>
                  </div>

                  {tokenInfo.checkedInAt && (
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Checked In At</p>
                        <p className="font-medium">
                          {format(new Date(tokenInfo.checkedInAt), "hh:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Refresh Button */}
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={refreshStatus}
                  disabled={isLoading}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh Status
                </Button>
                {lastRefresh && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last updated: {format(lastRefresh, "hh:mm:ss a")}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Instructions */}
        {!tokenInfo && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-center text-gray-500 mt-8"
          >
            <Hash className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">Enter your token number or appointment ID</p>
            <p className="text-sm">
              Your token number was provided when you checked in at the clinic
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
