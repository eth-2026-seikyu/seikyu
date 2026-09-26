import type { HTMLAttributes } from "react";

function cx(...classes: Array<string | false | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Bordered, rounded container with consistent padding. Renders a single
 * `<div>` with no extra wrapper so it's a safe drop-in for any existing
 * `rounded-xl border ... p-4`-style container, including ones that carry a
 * `data-*` attribute scripts select on.
 */
export function Card({ className, ...rest }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-xl border border-black/[.08] p-4 dark:border-white/[.145]",
        className,
      )}
      {...rest}
    />
  );
}

export default Card;
