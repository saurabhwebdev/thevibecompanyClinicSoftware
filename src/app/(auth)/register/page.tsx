"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
    tenantSlug: z
      .string()
      .min(3, "Organization ID must be at least 3 characters")
      .max(50, "Organization ID must be less than 50 characters")
      .regex(
        /^[a-z0-9-]+$/,
        "Only lowercase letters, numbers, and hyphens allowed"
      ),
    tenantName: z.string().optional(),
    createNewTenant: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (data.createNewTenant && (!data.tenantName || data.tenantName.trim().length < 2)) {
        return false;
      }
      return true;
    },
    {
      message: "Organization name is required when creating a new organization",
      path: ["tenantName"],
    }
  );

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      createNewTenant: true,
      tenantSlug: "",
      tenantName: "",
    },
  });

  const createNewTenant = watch("createNewTenant");
  const tenantName = watch("tenantName");

  // Auto-generate slug from organization name
  const handleTenantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setValue("tenantName", name);

    if (createNewTenant && name) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
      setValue("tenantSlug", slug);
    }
  };

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          tenantSlug: data.tenantSlug.toLowerCase(),
          tenantName: data.createNewTenant ? data.tenantName : undefined,
          createNewTenant: data.createNewTenant,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Registration failed");
      } else {
        toast.success(result.message || "Registration successful! Please sign in.");
        router.push("/login");
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
          src="/images/auth/register-medical.jpg"
          alt="Medical team"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-primary/20" />
        <div className="absolute inset-0 flex flex-col justify-end p-12 bg-gradient-to-t from-black/60 to-transparent">
          <h2 className="text-4xl font-bold text-white mb-4">
            {createNewTenant ? "Start Your Journey" : "Join Your Team"}
          </h2>
          <p className="text-lg text-white/90 max-w-md">
            {createNewTenant
              ? "Create your organization and start managing your clinic with our comprehensive healthcare solution."
              : "Join an existing organization and collaborate with your healthcare team."}
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          {/* Logo/Brand */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
              <svg
                className="w-7 h-7 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Create an account
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Enter your details to get started
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium text-sm">Create new organization</p>
              <p className="text-xs text-muted-foreground">
                {createNewTenant
                  ? "You'll be the admin"
                  : "Join existing organization"}
              </p>
            </div>
            <Switch
              checked={createNewTenant}
              onCheckedChange={(checked) => {
                setValue("createNewTenant", checked);
                if (!checked) {
                  setValue("tenantName", "");
                }
              }}
            />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Organization Fields */}
            {createNewTenant && (
              <div className="space-y-2">
                <Label htmlFor="tenantName">Organization Name</Label>
                <Input
                  id="tenantName"
                  placeholder="My Clinic"
                  className="h-11"
                  value={tenantName || ""}
                  onChange={handleTenantNameChange}
                />
                {errors.tenantName && (
                  <p className="text-sm text-destructive">{errors.tenantName.message}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="tenantSlug">
                {createNewTenant ? "Organization ID" : "Organization ID to Join"}
              </Label>
              <Input
                id="tenantSlug"
                placeholder="my-clinic"
                className="h-11"
                {...register("tenantSlug")}
              />
              <p className="text-xs text-muted-foreground">
                {createNewTenant
                  ? "This will be used in URLs (auto-generated from name)"
                  : "Enter the organization ID provided by your admin"}
              </p>
              {errors.tenantSlug && (
                <p className="text-sm text-destructive">{errors.tenantSlug.message}</p>
              )}
            </div>

            {/* User Fields */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="h-11"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                className="h-11"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create password"
                  className="h-11"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm password"
                  className="h-11"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={isLoading}>
              {isLoading
                ? "Creating account..."
                : createNewTenant
                ? "Create Organization & Account"
                : "Create Account"}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
