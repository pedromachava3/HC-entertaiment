import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-semibold tracking-wide transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hc-red [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-hc-red text-white shadow-[0_8px_30px_-8px_rgba(255,16,16,0.6)] hover:bg-hc-red-dark hover:shadow-[0_10px_40px_-8px_rgba(255,16,16,0.75)]",
        secondary: "bg-white text-ink hover:bg-white/90",
        outline: "border border-white/20 bg-white/[0.02] text-white hover:border-white/50 hover:bg-white/5",
        ghost: "text-white/80 hover:bg-white/5 hover:text-white",
        danger: "border border-hc-red/50 text-hc-red hover:bg-hc-red/10",
        success: "bg-emerald-500 text-ink hover:bg-emerald-400",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-6 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
