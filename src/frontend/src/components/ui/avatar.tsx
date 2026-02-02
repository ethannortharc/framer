'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  initials: string;
  size?: 'sm' | 'md' | 'lg';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, initials, size = 'md', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-6 w-6 text-[10px]',
      md: 'h-8 w-8 text-xs',
      lg: 'h-10 w-10 text-sm',
    };

    // Generate consistent color from initials
    const colors = [
      'bg-rose-500',
      'bg-amber-500',
      'bg-emerald-500',
      'bg-blue-500',
      'bg-violet-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-orange-500',
    ];
    const colorIndex = initials.charCodeAt(0) % colors.length;
    const bgColor = colors[colorIndex];

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-full font-medium text-white',
          sizeClasses[size],
          bgColor,
          className
        )}
        {...props}
      >
        {initials}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
