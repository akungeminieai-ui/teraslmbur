import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@teras-lmbur/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
        secondary: 'bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--accent)]',
        outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
        ghost: 'hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
        link: 'text-brand-500 underline-offset-4 hover:underline',
        danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700',
      },
      size: {
        sm: 'h-8 px-3 rounded-md text-xs',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 py-3 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface AppButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const AppButton = React.forwardRef<HTMLButtonElement, AppButtonProps>(
  ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

AppButton.displayName = 'AppButton';
