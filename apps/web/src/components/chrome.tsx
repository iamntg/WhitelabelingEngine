import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

/**
 * Shared chrome primitives, ported from the design export.
 *
 * Every interactive element here carries a visible focus ring. The design
 * defined `style-focus` only on inputs and the type combobox; the spec requires
 * it everywhere, so the treatment is extended rather than reinvented — same
 * accent, same 3px ring, same 120ms transition.
 */

export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`icon ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const height = size === 'sm' ? 'h-[26px] px-2.5 text-12' : 'h-[30px] px-3 text-12-5';

  // Note the primary button is near-black, not the accent and never the
  // tenant's brand colour. The tool must stay desaturated.
  const variants: Record<ButtonVariant, string> = {
    primary:
      'focus-ring-strong border border-action bg-action text-white hover:bg-action-hover disabled:cursor-not-allowed disabled:border-ink-chevron disabled:bg-ink-chevron',
    secondary:
      'focus-ring border border-control bg-surface text-ink-strong hover:border-border-hover hover:bg-hover disabled:cursor-not-allowed disabled:text-ink-faint',
    ghost:
      'focus-ring rounded-6 border border-transparent text-ink-helper hover:text-ink disabled:cursor-not-allowed',
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-7 font-medium transition-[background-color,border-color,color] duration-[120ms] ${height} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`focus-ring h-[34px] w-full rounded-7 border border-control bg-surface px-2.5 text-13 text-ink outline-none transition-[border-color,box-shadow] duration-[120ms] hover:border-border-hover ${className}`}
      {...props}
    />
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <div className="mb-[7px] text-11-5 font-medium text-ink-label">{children}</div>;
}

export function FieldHint({ children }: { children: ReactNode }) {
  return <div className="mt-1.5 text-11 text-ink-hint">{children}</div>;
}

/** Uppercase caption used for section headers and table columns. */
export function Caption({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-12 font-semibold tracking-[0.02em] text-ink-heading uppercase ${className}`}
    >
      {children}
    </span>
  );
}

export function Mono({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`font-mono ${className}`}>{children}</span>;
}

interface SegmentedOption<T extends string> {
  id: T;
  label: ReactNode;
  title?: string;
}

/**
 * The trough-and-pill segmented control used for the brand filter, the preview
 * screen tabs and the light/dark toggle.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (next: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`flex gap-[3px] rounded-9 border border-hairline bg-surface p-[3px] ${className}`}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            title={option.title ?? undefined}
            onClick={() => onChange(option.id)}
            className={`focus-ring flex h-[28px] items-center gap-1.5 rounded-7 border border-transparent px-3 text-12-5 font-medium transition-colors duration-[120ms] ${
              selected ? 'bg-selected text-ink' : 'text-ink-muted hover:bg-hover'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * A collapsible left-panel section. The whole header is the toggle, as in the
 * design, so the hit target is the full 380px width rather than a small caret.
 */
export function PanelSection({
  title,
  open,
  onToggle,
  children,
  last = false,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  last?: boolean;
}) {
  const id = `panel-${title.toLowerCase()}`;

  return (
    <section className={`border-t border-divider ${last ? 'border-b' : ''}`}>
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={id}
          className="focus-ring flex w-full items-center justify-between px-5 py-[13px] text-left transition-colors hover:bg-subtle"
        >
          <Caption>{title}</Caption>
          <span className="text-10 text-ink-faint" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
        </button>
      </h2>
      {open ? (
        <div id={id} className="px-5 pb-5">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/**
 * A disabled control cannot receive focus and therefore cannot show a native
 * tooltip, which is exactly the case the publish button needs — the owner must
 * be able to find out *why* it is disabled. Wrapping in a focusable span keeps
 * the explanation reachable by keyboard.
 */
export function DisabledTooltip({
  reason,
  children,
}: {
  reason: string | null;
  children: ReactNode;
}) {
  if (!reason) return <>{children}</>;

  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label={reason}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-[calc(100%+6px)] right-0 z-50 w-56 rounded-8 border border-raised bg-surface px-2.5 py-2 text-11-5 leading-[1.45] text-ink-body opacity-0 shadow-popover transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {reason}
      </span>
    </span>
  );
}
