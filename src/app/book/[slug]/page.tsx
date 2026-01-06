"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { format, addDays, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { WidgetInstance } from "friendly-challenge";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Stethoscope,
  FileText,
  AlertCircle,
  Building2,
  CreditCard,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Friendly Captcha Component
function FriendlyCaptcha({
  siteKey,
  onVerify,
  containerRef,
  widgetRef,
}: {
  siteKey: string;
  onVerify: (token: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  widgetRef: React.MutableRefObject<WidgetInstance | null>;
}) {
  useEffect(() => {
    if (!containerRef.current || widgetRef.current) return;

    // Dynamically import and create widget
    import("friendly-challenge").then(({ WidgetInstance }) => {
      if (!containerRef.current) return;

      widgetRef.current = new WidgetInstance(containerRef.current, {
        sitekey: siteKey,
        doneCallback: (solution: string) => {
          onVerify(solution);
        },
        errorCallback: () => {
          onVerify(null);
        },
      });
    });

    return () => {
      if (widgetRef.current) {
        widgetRef.current.destroy();
        widgetRef.current = null;
      }
    };
  }, [siteKey, onVerify, containerRef, widgetRef]);

  return (
    <div className="space-y-2 pt-2">
      <Label className="flex items-center gap-2">
        <Shield className="h-4 w-4" />
        Security Verification <span className="text-destructive">*</span>
      </Label>
      <div className="flex justify-center">
        <div ref={containerRef} className="frc-captcha" />
      </div>
    </div>
  );
}

interface Clinic {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  termsAndConditions?: string;
  cancellationPolicy?: string;
  requirePhoneNumber: boolean;
  requireEmail: boolean;
  captchaEnabled: boolean;
  captchaSiteKey?: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization?: string;
  qualifications?: string;
  bio?: string;
  consultationFee?: number;
  slotDuration: number;
  advanceBookingDays: number;
}

interface BookingForm {
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  notes: string;
  agreedToTerms: boolean;
}

type Step = "doctor" | "datetime" | "details" | "confirm";

const steps: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: "doctor", label: "Doctor", icon: Stethoscope },
  { key: "datetime", label: "Date & Time", icon: Calendar },
  { key: "details", label: "Details", icon: User },
  { key: "confirm", label: "Confirm", icon: Check },
];

export default function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Booking state
  const [currentStep, setCurrentStep] = useState<Step>("doctor");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);

  // CAPTCHA state
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);
  const captchaWidgetRef = useRef<WidgetInstance | null>(null);

  const [form, setForm] = useState<BookingForm>({
    patientName: "",
    patientEmail: "",
    patientPhone: "",
    notes: "",
    agreedToTerms: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [bookedAppointment, setBookedAppointment] = useState<{ date: string; time: string } | null>(null);

  const fetchClinicInfo = useCallback(async () => {
    try {
      const response = await fetch(`/api/public-booking?slug=${slug}`);
      const result = await response.json();

      if (result.success) {
        setClinic(result.data.clinic);
        setDoctors(result.data.doctors);
      } else {
        setError(result.error || "Clinic not found");
      }
    } catch {
      setError("Failed to load clinic information");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDoctor || !selectedDate) return;

    setIsLoadingSlots(true);
    setSlotsMessage(null);
    setSelectedTime(null);

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const response = await fetch(
        `/api/public-booking/slots?slug=${slug}&doctorId=${selectedDoctor.id}&date=${dateStr}`
      );
      const result = await response.json();

      if (result.success) {
        setAvailableSlots(result.data.availableSlots);
        setSlotsMessage(result.data.message || null);
      } else {
        setAvailableSlots([]);
        setSlotsMessage(result.error);
      }
    } catch {
      setAvailableSlots([]);
      setSlotsMessage("Failed to load available slots");
    } finally {
      setIsLoadingSlots(false);
    }
  }, [selectedDoctor, selectedDate, slug]);

  useEffect(() => {
    fetchClinicInfo();
  }, [fetchClinicInfo]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDoctor, selectedDate, fetchAvailableSlots]);

  const handleSubmit = async () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) return;

    // Verify CAPTCHA if enabled
    if (clinic?.captchaEnabled && !captchaToken) {
      setError("Please complete the CAPTCHA verification");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/public-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          doctorId: selectedDoctor.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          time: selectedTime,
          patientName: form.patientName,
          patientEmail: form.patientEmail || undefined,
          patientPhone: form.patientPhone || undefined,
          notes: form.notes || undefined,
          agreedToTerms: form.agreedToTerms,
          captchaToken: captchaToken || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBookingComplete(true);
        setConfirmationMessage(result.data.confirmationMessage);
        setBookedAppointment(result.data.appointment);
      } else {
        setError(result.error);
        // Reset CAPTCHA on error
        if (captchaWidgetRef.current) {
          captchaWidgetRef.current.reset();
          setCaptchaToken(null);
        }
      }
    } catch {
      setError("Failed to create booking");
      // Reset CAPTCHA on error
      if (captchaWidgetRef.current) {
        captchaWidgetRef.current.reset();
        setCaptchaToken(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateDateOptions = () => {
    if (!selectedDoctor) return [];

    const dates: Date[] = [];
    const today = startOfDay(new Date());

    for (let i = 0; i <= selectedDoctor.advanceBookingDays; i++) {
      dates.push(addDays(today, i));
    }

    return dates;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const canProceed = () => {
    switch (currentStep) {
      case "doctor":
        return !!selectedDoctor;
      case "datetime":
        return !!selectedDate && !!selectedTime;
      case "details":
        const hasName = !!form.patientName.trim();
        const hasEmail = !clinic?.requireEmail || !!form.patientEmail.trim();
        const hasPhone = !clinic?.requirePhoneNumber || !!form.patientPhone.trim();
        const hasAgreed = !clinic?.termsAndConditions || form.agreedToTerms;
        const hasCaptcha = !clinic?.captchaEnabled || !!captchaToken;
        return hasName && hasEmail && hasPhone && hasAgreed && hasCaptcha;
      default:
        return true;
    }
  };

  const goToStep = (step: Step) => {
    setCurrentStep(step);
    setError(null);
  };

  const nextStep = () => {
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].key);
      setError(null);
    }
  };

  const prevStep = () => {
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].key);
      setError(null);
    }
  };

  const getStepStatus = (stepKey: Step) => {
    const currentIndex = steps.findIndex(s => s.key === currentStep);
    const stepIndex = steps.findIndex(s => s.key === stepKey);

    if (stepIndex < currentIndex) return "completed";
    if (stepIndex === currentIndex) return "current";
    return "upcoming";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading booking information...</p>
        </motion.div>
      </div>
    );
  }

  // Error state (when clinic not found)
  if (error && !clinic && !bookingComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Unable to Load</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (bookingComplete && bookedAppointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg"
        >
          <Card>
            <CardContent className="pt-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
              >
                <Check className="h-10 w-10 text-success" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
              <p className="text-muted-foreground mb-8">{confirmationMessage}</p>

              <Card className="bg-muted/50 text-left mb-6">
                <CardContent className="pt-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Doctor</p>
                      <p className="font-semibold">{selectedDoctor?.name}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-semibold">{format(new Date(bookedAppointment.date), "EEEE, MMMM d, yyyy")}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-semibold">{formatTime(bookedAppointment.time)}</p>
                    </div>
                  </div>
                  {clinic?.address && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Location</p>
                          <p className="font-semibold">{clinic.address}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {clinic?.cancellationPolicy && (
                <p className="text-xs text-muted-foreground">
                  {clinic.cancellationPolicy}
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-50 shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{clinic?.name}</h1>
              {clinic?.description && (
                <p className="text-sm text-muted-foreground line-clamp-1">{clinic.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-card border-b shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {steps.map((step, index) => {
                const status = getStepStatus(step.key);
                const Icon = step.icon;

                return (
                  <li key={step.key} className="flex items-center">
                    <button
                      onClick={() => {
                        if (status === "completed") goToStep(step.key);
                      }}
                      disabled={status === "upcoming"}
                      className={cn(
                        "flex items-center gap-2 transition-colors",
                        status === "completed" && "cursor-pointer hover:text-primary",
                        status === "current" && "text-primary",
                        status === "upcoming" && "text-muted-foreground cursor-not-allowed"
                      )}
                    >
                      <span
                        className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors",
                          status === "completed" && "bg-primary border-primary text-primary-foreground",
                          status === "current" && "border-primary text-primary bg-primary/10",
                          status === "upcoming" && "border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {status === "completed" ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </span>
                      <span className="hidden sm:block font-medium">{step.label}</span>
                    </button>
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          "w-12 sm:w-24 h-0.5 mx-2",
                          status === "completed" ? "bg-primary" : "bg-border"
                        )}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-8 w-full">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Doctor */}
          {currentStep === "doctor" && (
            <motion.div
              key="doctor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold">Select a Doctor</h2>
                <p className="text-muted-foreground">Choose a healthcare provider for your appointment</p>
              </div>

              {doctors.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center py-12">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">No Doctors Available</h3>
                    <p className="text-muted-foreground">
                      No doctors are currently available for online booking.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {doctors.map((doctor) => (
                    <motion.div key={doctor.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Card
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          selectedDoctor?.id === doctor.id && "ring-2 ring-primary border-primary"
                        )}
                        onClick={() => setSelectedDoctor(doctor)}
                      >
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <Stethoscope className="h-7 w-7 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h3 className="font-semibold text-lg">{doctor.name}</h3>
                                  {doctor.specialization && (
                                    <p className="text-sm text-primary">{doctor.specialization}</p>
                                  )}
                                </div>
                                {selectedDoctor?.id === doctor.id && (
                                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="h-4 w-4 text-primary-foreground" />
                                  </div>
                                )}
                              </div>
                              {doctor.qualifications && (
                                <p className="text-xs text-muted-foreground mt-1">{doctor.qualifications}</p>
                              )}
                              {doctor.bio && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{doctor.bio}</p>
                              )}
                              <div className="flex items-center gap-4 mt-4">
                                {doctor.consultationFee !== undefined && (
                                  <Badge variant="secondary" className="gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {formatCurrency(doctor.consultationFee)}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="gap-1">
                                  <Clock className="h-3 w-3" />
                                  {doctor.slotDuration} min
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 2: Select Date & Time */}
          {currentStep === "datetime" && selectedDoctor && (
            <motion.div
              key="datetime"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold">Select Date & Time</h2>
                <p className="text-muted-foreground">Choose a convenient time for your appointment</p>
              </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">Select Date</Label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                  {generateDateOptions().slice(0, 14).map((date) => {
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isToday = date.toDateString() === new Date().toDateString();

                    return (
                      <motion.button
                        key={date.toISOString()}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedDate(date)}
                        className={cn(
                          "flex-shrink-0 w-16 h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all",
                          isSelected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary/50"
                        )}
                      >
                        <span className="text-xs uppercase font-medium">
                          {isToday ? "Today" : format(date, "EEE")}
                        </span>
                        <span className="text-2xl font-bold">{format(date, "d")}</span>
                        <span className="text-xs">{format(date, "MMM")}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Select Time</Label>

                  {isLoadingSlots ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : slotsMessage ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{slotsMessage}</AlertDescription>
                    </Alert>
                  ) : availableSlots.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No available slots for this date. Please select another date.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {availableSlots.map((time) => (
                        <motion.button
                          key={time}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all",
                            selectedTime === time
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/50"
                          )}
                        >
                          {formatTime(time)}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Step 3: Patient Details */}
          {currentStep === "details" && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold">Your Details</h2>
                <p className="text-muted-foreground">Please provide your contact information</p>
              </div>

              <Card>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={form.patientName}
                      onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email {clinic?.requireEmail && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.patientEmail}
                        onChange={(e) => setForm({ ...form, patientEmail: e.target.value })}
                        placeholder="your@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Phone Number {clinic?.requirePhoneNumber && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={form.patientPhone}
                        onChange={(e) => setForm({ ...form, patientPhone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Any special requirements or reason for visit..."
                      rows={3}
                    />
                  </div>

                  {clinic?.termsAndConditions && (
                    <div className="flex items-start gap-3 pt-2">
                      <Checkbox
                        id="terms"
                        checked={form.agreedToTerms}
                        onCheckedChange={(checked) => setForm({ ...form, agreedToTerms: !!checked })}
                      />
                      <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer leading-relaxed">
                        I agree to the terms and conditions
                      </label>
                    </div>
                  )}

                  {/* CAPTCHA - Friendly Captcha */}
                  {clinic?.captchaEnabled && clinic?.captchaSiteKey && (
                    <FriendlyCaptcha
                      siteKey={clinic.captchaSiteKey}
                      onVerify={setCaptchaToken}
                      containerRef={captchaContainerRef}
                      widgetRef={captchaWidgetRef}
                    />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === "confirm" && selectedDoctor && selectedDate && selectedTime && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold">Confirm Your Booking</h2>
                <p className="text-muted-foreground">Please review your appointment details</p>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Appointment Summary</CardTitle>
                  <CardDescription>Review and confirm your booking details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Doctor Info */}
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Stethoscope className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedDoctor.name}</p>
                      {selectedDoctor.specialization && (
                        <p className="text-sm text-muted-foreground">{selectedDoctor.specialization}</p>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Appointment Details */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-semibold">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-semibold">{formatTime(selectedTime)}</p>
                      </div>
                    </div>

                    {selectedDoctor.consultationFee !== undefined && (
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Consultation Fee</p>
                          <p className="font-semibold">{formatCurrency(selectedDoctor.consultationFee)}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-semibold">{selectedDoctor.slotDuration} minutes</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Patient Details */}
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Patient Name</p>
                        <p className="font-semibold">{form.patientName}</p>
                      </div>
                    </div>

                    {form.patientEmail && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-semibold">{form.patientEmail}</p>
                        </div>
                      </div>
                    )}

                    {form.patientPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-semibold">{form.patientPhone}</p>
                        </div>
                      </div>
                    )}

                    {form.notes && (
                      <div className="flex items-start gap-3 sm:col-span-2">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm text-muted-foreground">Notes</p>
                          <p className="font-semibold">{form.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {clinic?.cancellationPolicy && (
                <Alert className="mb-4">
                  <FileText className="h-4 w-4" />
                  <AlertDescription>{clinic.cancellationPolicy}</AlertDescription>
                </Alert>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t pb-12">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === "doctor"}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep === "confirm" ? (
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed()} size="lg">
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t mt-12 shrink-0">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            {clinic?.address && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{clinic.address}</span>
              </div>
            )}
            <div className="flex items-center gap-4">
              {clinic?.phone && (
                <a href={`tel:${clinic.phone}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Phone className="h-3 w-3" /> {clinic.phone}
                </a>
              )}
              {clinic?.email && (
                <a href={`mailto:${clinic.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                  <Mail className="h-3 w-3" /> {clinic.email}
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
