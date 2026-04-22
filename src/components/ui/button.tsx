import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base — all buttons are square, pixel font, hard transitions
  "group/button inline-flex shrink-0 items-center justify-center border-2 bg-clip-padding font-pixel-body text-[15px] whitespace-nowrap transition-all duration-100 outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-ring active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:translate-x-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Primary: ember-filled with pixel shadow
        default:
          "border-amber-700 bg-ember text-bg-0 pixel-inset hover:bg-amber-500 hover:border-amber-600 dark:border-amber-600 dark:hover:bg-amber-600",
        // Outline: transparent with border
        outline:
          "border-line bg-transparent text-ink-1 hover:bg-bg-2 hover:text-ink-0 hover:border-ember aria-expanded:bg-bg-2",
        // Secondary: muted fill
        secondary:
          "border-line bg-bg-2 text-ink-1 hover:bg-bg-3 hover:text-ink-0 aria-expanded:bg-bg-2",
        // Ghost: no border, minimal
        ghost:
          "border-transparent bg-transparent text-ink-2 hover:bg-bg-2 hover:text-ink-0 aria-expanded:bg-bg-2",
        // Destructive: red pixel button
        destructive:
          "border-bad/60 bg-bad/10 text-bad hover:bg-bad/20 hover:border-bad focus-visible:ring-bad/40",
        link: "border-transparent text-ember underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-3",
        xs: "h-6 gap-1 px-2 text-[12px]",
        sm: "h-7 gap-1 px-2.5 text-[13px]",
        lg: "h-10 gap-2 px-4 text-[16px]",
        icon: "size-8",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
