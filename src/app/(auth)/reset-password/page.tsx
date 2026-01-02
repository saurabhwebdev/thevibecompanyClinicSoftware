"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle } from "lucide-react";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const tenantSlug = searchParams.get("tenant") || "default";

  const [isLoading, setIsLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password: data.password,
          tenantSlug,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Reset failed");
      } else {
        setIsReset(true);
        toast.success("Password reset successful!");
        setTimeout(() => router.push("/login"), 3000);
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Invalid Token State
  if (!token) {
    return (
      <>
        {/* Left Side - Image */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <Image
            src="/images/auth/reset-password.jpg"
            alt="Healthcare professional"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-destructive/20" />
        </div>

        {/* Right Side - Error */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Invalid Link
              </h1>
              <p className="text-muted-foreground mt-2">
                This password reset link is invalid or has expired.
              </p>
            </div>
            <Link href="/forgot-password">
              <Button className="w-full h-12">Request new reset link</Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Success State
  if (isReset) {
    return (
      <>
        {/* Left Side - Image */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <Image
            src="/images/auth/reset-password.jpg"
            alt="Healthcare professional"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-green-500/20" />
        </div>

        {/* Right Side - Success */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md space-y-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Password Reset!
              </h1>
              <p className="text-muted-foreground mt-2">
                Your password has been reset successfully. Redirecting to login...
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Form State
  return (
    <>
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/images/auth/reset-password.jpg"
          alt="Healthcare professional"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-4xl font-bold text-white mb-4">
            Almost There!
          </h2>
          <p className="text-lg text-white/90 max-w-md">
            Create a new secure password for your account and get back to managing your clinic.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {/* Logo/Brand */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Reset your password
            </h1>
            <p className="text-muted-foreground mt-2">
              Enter your new password below
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                className="h-12"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                className="h-12"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset password"}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
