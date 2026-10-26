import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pri",
  {
    variants: {
      variant: {
        default:
          "bg-pri text-onp shadow-pri hover:opacity-95 min-h-[52px] px-5",
        gold: "bg-acc text-[#1b1300] shadow-lg hover:brightness-105 min-h-[52px] px-5",
        outline:
          "border-[1.5px] border-line bg-transparent text-pri hover:bg-pri/5 min-h-[52px] px-5",
        ghost: "bg-transparent text-ink hover:bg-line/40 min-h-[48px] px-4",
        danger: "bg-bad text-white hover:opacity-90 min-h-[48px] px-4",
      },
      size: {
        default: "min-h-[52px] px-5 py-3 text-base",
        sm: "min-h-[40px] rounded-xl px-3.5 py-1.5 text-sm font-semibold shadow-none",
        lg: "min-h-[56px] rounded-2xl px-7 text-lg",
        icon: "h-12 w-12 rounded-2xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
