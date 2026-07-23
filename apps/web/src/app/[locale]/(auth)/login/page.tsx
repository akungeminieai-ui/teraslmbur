/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppButton } from '@teras-lmbur/ui';
import { useState } from 'react';
import { useAppToast } from '@/hooks/use-app-toast';
import { apiClient } from '@/lib/api-client';

import { useAuth } from '@/providers/auth-provider';

const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const toastApp = useAppToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const authData = await apiClient.post<any>('/auth/login', data);
      toastApp.rawSuccess(`Welcome back, ${authData.user.name}!`);
      login(authData);
    } catch (err: any) {
      toastApp.rawError(err.message || 'Invalid credentials. Hint: owner@teraslmbur.com / password123');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-xl">
      <div className="flex flex-col items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white shadow-glow">
          <span className="text-lg font-bold">TL</span>
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          Teras Lmbur Restaurant Management
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="owner@teraslmbur.com"
              {...register('email')}
              className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-danger-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--foreground)]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              className="mt-1 flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {errors.password && (
              <p className="mt-1 text-xs text-danger-500">{errors.password.message}</p>
            )}
          </div>
        </div>

        <AppButton
          type="submit"
          className="w-full text-sm font-semibold"
          isLoading={isLoading}
        >
          Sign In
        </AppButton>
      </form>
    </div>
  );
}
