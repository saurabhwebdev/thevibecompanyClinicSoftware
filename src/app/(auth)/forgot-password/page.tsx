"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  tenantSlug: z.string().min(1, "Organization is required"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      tenantSlug: "default",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Request failed");
      } else {
        setIsSubmitted(true);
        toast.success("Check your email for reset instructions");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Left Side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/images/auth/forgot-password.jpg"
          alt="Healthcare professional"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-4xl font-bold text-white mb-4">
            Need Help?
          </h2>
          <p className="text-lg text-white/90 max-w-md">
            Don&apos;t worry, we&apos;ll help you reset your password and get back to managing your clinic in no time.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          {isSubmitted ? (
            /* Success State */
            <div className="text-center space-y-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Check your email
                </h1>
                <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                  If an account exists with that email, we&apos;ve sent password reset instructions to your inbox.
                </p>
              </div>
              <Link href="/login">
                <Button variant="outline" className="w-full h-12">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <>
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
                      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-foreground">
                  Forgot your password?
                </h1>
                <p className="text-muted-foreground mt-2">
                  Enter your email and we&apos;ll send you reset instructions
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tenantSlug">Organization</Label>
                  <Input
                    id="tenantSlug"
                    placeholder="your-organization"
                    className="h-12"
                    {...register("tenantSlug")}
                  />
                  {errors.tenantSlug && (
                    <p className="text-sm text-destructive">{errors.tenantSlug.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="h-12"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send reset instructions"}
                </Button>
              </form>

              {/* Footer */}
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
