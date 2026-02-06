'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 md:max-w-[420px]',
      className,
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border-l-4 p-4 pr-8 shadow-xl backdrop-blur-md transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-top-full data-[state=open]:slide-in-from-top-full data-[state=open]:fade-in-90 data-[state=open]:zoom-in-95',
  {
    variants: {
      variant: {
        default: 'border-l-blue-500 bg-gradient-to-r from-blue-50 to-white dark:from-blue-950/50 dark:to-background border-t border-r border-b border-blue-200/50 dark:border-blue-800/50 text-foreground shadow-blue-500/20',
        destructive:
          'destructive group border-l-red-500 bg-gradient-to-r from-red-50 to-white dark:from-red-950/50 dark:to-background border-t border-r border-b border-red-200/50 dark:border-red-800/50 text-red-900 dark:text-red-100 shadow-red-500/30',
        success:
          'border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/50 dark:to-background border-t border-r border-b border-emerald-200/50 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-100 shadow-emerald-500/30',
        warning:
          'border-l-amber-500 bg-gradient-to-r from-amber-50 to-white dark:from-amber-950/50 dark:to-background border-t border-r border-b border-amber-200/50 dark:border-amber-800/50 text-amber-900 dark:text-amber-100 shadow-amber-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive',
      className,
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1.5 text-foreground/50 opacity-0 transition-all hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-hover:opacity-100 group-[.destructive]:text-red-600 dark:group-[.destructive]:text-red-400 group-[.destructive]:hover:bg-red-100 dark:group-[.destructive]:hover:bg-red-900/30 group-[.destructive]:hover:text-red-700 dark:group-[.destructive]:hover:text-red-300 group-[.success]:text-emerald-600 dark:group-[.success]:text-emerald-400 group-[.success]:hover:bg-emerald-100 dark:group-[.success]:hover:bg-emerald-900/30 group-[.success]:hover:text-emerald-700 dark:group-[.success]:hover:text-emerald-300 group-[.warning]:text-amber-600 dark:group-[.warning]:text-amber-400 group-[.warning]:hover:bg-amber-100 dark:group-[.warning]:hover:bg-amber-900/30 group-[.warning]:hover:text-amber-700 dark:group-[.warning]:hover:text-amber-300',
      className,
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold leading-tight tracking-tight', className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm leading-relaxed opacity-80 mt-0.5', className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
