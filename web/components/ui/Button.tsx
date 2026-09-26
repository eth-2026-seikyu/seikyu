import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";
export type ButtonSize = "default" | "sm";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-black text-white dark:bg-white dark:text-black",
  secondary:
    "border border-black/[.08] bg-transparent text-inherit dark:border-white/[.145]",
  danger:
    "border border-red-300 bg-transparent text-red-700 dark:border-red-900/50 dark:text-red-400",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  default: "min-h-11 px-4 py-2 text-sm",
  sm: "min-h-9 px-3 py-1.5 text-xs",
};

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/**
 * Shared button primitive. Always renders a native `<button>` and forwards
 * every prop it's given (type, disabled, onClick, data-*, aria-*, etc.) so
 * call sites can swap in this component without losing behaviour.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "default", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex items-center justify-center rounded-full font-medium cursor-pointer transition-opacity",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black/50 dark:focus-visible:ring-white/50 dark:focus-visible:ring-offset-black",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        className,
      )}
      {...rest}
    />
  );
});

export default Button;
