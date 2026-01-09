"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, CheckCircle, RefreshCw, Volume2, VolumeX } from "lucide-react";

interface Patient {
  firstName: string;
  lastName: string;
}

interface Doctor {
  name: string;
}

interface QueueItem {
  _id: string;
  tokenDisplayNumber: string;
  tokenNumber: number;
  patientId: Patient;
  doctorId: Doctor;
  estimatedWaitMinutes?: number;
  checkedInAt: string;
}

interface QueueStatus {
  currentServing: QueueItem | null;
  waitingQueue: QueueItem[];
  waitingCount: number;
  completedCount: number;
  totalCheckedIn: number;
  nextToken: QueueItem | null;
}

export default function TokenDisplayPage() {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [lastToken, setLastToken] = useState<string | null>(null);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/queue-status");
      const result = await response.json();
      if (result.success) {
        const newStatus = result.data as QueueStatus;

        // Check if token changed to play sound
        if (isSoundEnabled && newStatus.currentServing?.tokenDisplayNumber !== lastToken) {
          playNotificationSound();
          setLastToken(newStatus.currentServing?.tokenDisplayNumber || null);
        }

        setQueueStatus(newStatus);
      }
    } catch (error) {
      console.error("Failed to fetch queue status:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isSoundEnabled, lastToken]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio("/notification.mp3");
      audio.play().catch(() => {
        // Audio play failed, likely due to browser restrictions
      });
    } catch {
      // Audio not available
    }
  };

  useEffect(() => {
    fetchQueueStatus();

    // Refresh queue status every 10 seconds
    const queueInterval = setInterval(fetchQueueStatus, 10000);

    // Update clock every second
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(queueInterval);
      clearInterval(clockInterval);
    };
  }, [fetchQueueStatus]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="h-16 w-16 text-white" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-4 sm:p-8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold">Patient Queue</h1>
          <p className="text-sm sm:text-lg text-blue-200">{format(currentTime, "EEEE, MMMM dd, yyyy")}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isSoundEnabled ? <Volume2 className="h-5 w-5 sm:h-6 sm:w-6" /> : <VolumeX className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>
          <div className="text-3xl sm:text-5xl font-mono font-bold">
            <Clock className="h-6 w-6 sm:h-8 sm:w-8 inline mr-2 opacity-70" />
            {format(currentTime, "HH:mm:ss")}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 h-[calc(100vh-140px)] sm:h-[calc(100vh-180px)]">
        {/* Now Serving - Left Side */}
        <div className="lg:col-span-1">
          <motion.div
            className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-3xl p-4 sm:p-8 h-full border border-green-400/30 backdrop-blur-sm"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-lg sm:text-2xl font-semibold text-green-300 mb-4 sm:mb-6 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 sm:h-7 sm:w-7" />
              Now Serving
            </h2>

            <AnimatePresence mode="wait">
              {queueStatus?.currentServing ? (
                <motion.div
                  key={queueStatus.currentServing.tokenDisplayNumber}
                  initial={{ scale: 0.8, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, type: "spring" }}
                  className="text-center"
                >
                  <motion.div
                    className="text-6xl sm:text-9xl font-black text-green-400 mb-4 font-mono tracking-wider"
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {queueStatus.currentServing.tokenDisplayNumber}
                  </motion.div>
                  <div className="text-xl sm:text-3xl font-medium text-green-200">
                    {queueStatus.currentServing.patientId?.firstName} {queueStatus.currentServing.patientId?.lastName?.charAt(0)}.
                  </div>
                  <div className="text-base sm:text-xl text-green-300/70 mt-2">
                    Dr. {queueStatus.currentServing.doctorId?.name}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-green-300/50"
                >
                  <div className="text-4xl sm:text-6xl mb-4">---</div>
                  <p className="text-base sm:text-xl">No patient being served</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Waiting Queue - Right Side */}
        <div className="lg:col-span-2">
          <motion.div
            className="bg-white/5 rounded-3xl p-4 sm:p-8 h-full border border-white/10 backdrop-blur-sm"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-2xl font-semibold text-blue-300 flex items-center gap-2">
                <Users className="h-5 w-5 sm:h-7 sm:w-7" />
                Waiting Queue
              </h2>
              <div className="text-base sm:text-xl text-blue-200">
                {queueStatus?.waitingCount || 0} patients waiting
              </div>
            </div>

            <div className="space-y-2 sm:space-y-4 overflow-y-auto max-h-[calc(100%-60px)] sm:max-h-[calc(100%-80px)]">
              <AnimatePresence>
                {queueStatus?.waitingQueue && queueStatus.waitingQueue.length > 0 ? (
                  queueStatus.waitingQueue.slice(0, 8).map((item, index) => (
                    <motion.div
                      key={item._id}
                      initial={{ x: 50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -50, opacity: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`flex items-center justify-between p-3 sm:p-5 rounded-xl sm:rounded-2xl ${
                        index === 0
                          ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30"
                          : "bg-white/5 border border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 sm:gap-6">
                        <div className={`text-2xl sm:text-4xl font-black font-mono ${
                          index === 0 ? "text-yellow-400" : "text-blue-400"
                        }`}>
                          {item.tokenDisplayNumber}
                        </div>
                        <div>
                          <div className="text-base sm:text-xl font-medium">
                            {item.patientId?.firstName} {item.patientId?.lastName?.charAt(0)}.
                          </div>
                          <div className="text-xs sm:text-sm text-white/50">
                            Dr. {item.doctorId?.name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {index === 0 ? (
                          <motion.span
                            className="text-yellow-400 text-sm sm:text-lg font-semibold"
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            NEXT
                          </motion.span>
                        ) : (
                          <span className="text-white/50 text-xs sm:text-sm">
                            ~{(item.estimatedWaitMinutes || index * 15)} min
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-white/30 py-12 sm:py-20"
                  >
                    <Users className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg sm:text-2xl">No patients in queue</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Stats Footer */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm border-t border-white/10 p-3 sm:p-4"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="flex justify-center gap-6 sm:gap-12">
          <div className="text-center">
            <div className="text-2xl sm:text-4xl font-bold text-blue-400">{queueStatus?.waitingCount || 0}</div>
            <div className="text-xs sm:text-sm text-white/50">Waiting</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-4xl font-bold text-green-400">{queueStatus?.completedCount || 0}</div>
            <div className="text-xs sm:text-sm text-white/50">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-4xl font-bold text-purple-400">{queueStatus?.totalCheckedIn || 0}</div>
            <div className="text-xs sm:text-sm text-white/50">Total Today</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
