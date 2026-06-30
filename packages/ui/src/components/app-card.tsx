import * as React from 'react';
import { cn } from '@teras-lmbur/utils';

export interface AppCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  glass?: boolean;
}

export const AppCard = React.forwardRef<HTMLDivElement, AppCardProps>(
  ({ className, hoverable, glass, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]',
          hoverable && 'transition-all duration-200 hover:border-[var(--muted-foreground)]/30 hover:shadow-md',
          glass && 'glass',
          className
        )}
        {...props}
      />
    );
  }
);
AppCard.displayName = 'AppCard';

export const AppCardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
);
AppCardHeader.displayName = 'AppCardHeader';

export const AppCardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
  )
);
AppCardTitle.displayName = 'AppCardTitle';

export const AppCardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-[var(--muted-foreground)]', className)} {...props} />
  )
);
AppCardDescription.displayName = 'AppCardDescription';

export const AppCardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
AppCardContent.displayName = 'AppCardContent';

export const AppCardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
AppCardFooter.displayName = 'AppCardFooter';
