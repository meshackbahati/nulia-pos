'use client';

import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const AlertDialogRoot = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;

interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  children?: React.ReactNode;
}

interface AlertDialogContentProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  children?: React.ReactNode;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
  children,
  ...props
}: AlertDialogContentProps) {
  const [isOpen, setIsOpen] = React.useState(open ?? false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (openState: boolean) => {
    setIsOpen(openState);
    if (onOpenChange) onOpenChange(openState);
    if (!openState && onCancel) onCancel();
  };

  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    success: 'bg-green-600 text-white hover:bg-green-700',
    warning: 'bg-amber-500 text-white hover:bg-amber-600',
  };

  return (
    <AlertDialogRoot open={isOpen} onOpenChange={handleOpenChange}>
      {children}
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full">
          <AlertDialogPrimitive.Title className="text-lg font-semibold">
            {title}
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
            {description}
          </AlertDialogPrimitive.Description>
          <div className="flex justify-end space-x-2 mt-4">
            {onCancel && (
              <AlertDialogPrimitive.Cancel asChild>
                <Button variant="outline" onClick={onCancel}>
                  {cancelText}
                </Button>
              </AlertDialogPrimitive.Cancel>
            )}
            <AlertDialogPrimitive.Action asChild>
              <Button 
                className={cn(
                  variantClasses[variant],
                  'focus:ring-2 focus:ring-offset-2 focus:ring-primary'
                )}
                onClick={onConfirm}
              >
                {confirmText}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogRoot>
  );
}

// Hook to use the alert dialog
export function useAlert() {
  const [alertState, setAlertState] = React.useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
    onCancel: undefined as (() => void) | undefined,
    confirmText: 'OK',
    cancelText: 'Cancel',
    variant: 'default' as const,
  });

  const showAlert = ({
    title,
    description,
    onConfirm = () => {},
    onCancel,
    confirmText = 'OK',
    cancelText = 'Cancel',
    variant = 'default',
  }: {
    title: string;
    description: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
  }) => {
    setAlertState({
      isOpen: true,
      title,
      description,
      onConfirm: () => {
        onConfirm();
        setAlertState(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: onCancel
        ? () => {
            onCancel();
            setAlertState(prev => ({ ...prev, isOpen: false }));
          }
        : undefined,
      confirmText,
      cancelText,
      variant,
    });
  };

  const AlertComponent = () => (
    <AlertDialog
      open={alertState.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          if (alertState.onCancel) alertState.onCancel();
        }
      }}
      title={alertState.title}
      description={alertState.description}
      onConfirm={alertState.onConfirm}
      onCancel={alertState.onCancel}
      confirmText={alertState.confirmText}
      cancelText={alertState.cancelText}
      variant={alertState.variant}
    />
  );

  return { showAlert, AlertComponent };
}

// Global alert function
let globalShowAlert: (options: {
  title: string;
  description: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
}) => void = () => {
  console.warn('Alert not initialized. Make sure to use AlertProvider at the root of your app.');
};

export const alert = (message: string, options: {
  title?: string;
  onConfirm?: () => void;
  confirmText?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
} = {}) => {
  globalShowAlert({
    title: options.title || 'Alert',
    description: message,
    onConfirm: options.onConfirm,
    confirmText: options.confirmText || 'OK',
    variant: options.variant || 'default',
  });
};

export const confirm = (message: string, options: {
  title?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
} = {}) => {
  return new Promise<boolean>((resolve) => {
    globalShowAlert({
      title: options.title || 'Confirm',
      description: message,
      onConfirm: () => {
        if (options.onConfirm) options.onConfirm();
        resolve(true);
      },
      onCancel: () => {
        if (options.onCancel) options.onCancel();
        resolve(false);
      },
      confirmText: options.confirmText || 'Confirm',
      cancelText: options.cancelText || 'Cancel',
      variant: options.variant || 'default',
    });
  });
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const { showAlert, AlertComponent } = useAlert();

  React.useEffect(() => {
    // Set the global showAlert function
    globalShowAlert = showAlert;
  }, [showAlert]);

  return (
    <>
      {children}
      <AlertComponent />
    </>
  );
}
