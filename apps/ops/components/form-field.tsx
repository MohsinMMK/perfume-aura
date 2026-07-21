import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@perfume-aura/ui/components/field";
import { Input } from "@perfume-aura/ui/components/input";
import { Textarea } from "@perfume-aura/ui/components/textarea";
import { cn } from "@perfume-aura/ui/lib/utils";

type FormFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  min?: number | string;
  step?: string | number;
  error?: string;
  hint?: string;
  className?: string;
  autoComplete?: string;
};

export function FormField({
  label,
  name,
  type = "text",
  required,
  placeholder,
  defaultValue,
  min,
  step,
  error,
  hint,
  className,
  autoComplete,
}: FormFieldProps) {
  return (
    <Field
      data-invalid={error ? true : undefined}
      className={cn(className)}
    >
      <FieldLabel htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </FieldLabel>
      <Input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        min={min}
        step={step}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <FieldDescription>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}

type TextAreaFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  error?: string;
  hint?: string;
  rows?: number;
  className?: string;
};

export function TextAreaField({
  label,
  name,
  required,
  placeholder,
  defaultValue,
  error,
  hint,
  rows = 3,
  className,
}: TextAreaFieldProps) {
  return (
    <Field
      data-invalid={error ? true : undefined}
      className={cn(className)}
    >
      <FieldLabel htmlFor={name}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </FieldLabel>
      <Textarea
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        rows={rows}
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <FieldDescription>{hint}</FieldDescription>
      ) : null}
    </Field>
  );
}
