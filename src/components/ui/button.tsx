import type { ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";
const styles = cva("button", {
  variants: {
    variant: {
      default: "button-primary",
      outline: "button-outline",
      secondary: "button-secondary",
    },
  },
  defaultVariants: { variant: "default" },
});
type Props = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof styles> & { asChild?: boolean };
export function Button({ className, variant, asChild, ...props }: Props) {
  const Component = asChild ? Slot : "button";
  return (
    <Component className={cn(styles({ variant }), className)} {...props} />
  );
}
