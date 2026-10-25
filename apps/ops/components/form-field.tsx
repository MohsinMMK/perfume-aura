"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Field } from "@astryxdesign/core/Field";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { cn } from "@/lib/cn";

type FormFieldProps = {
  label: string;
  name: string;
  id?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  value?: string | number;
  onChange?: (value: string) => void;
  min?: number | string;
  step?: string | number;
  error?: string;
  /** Shown in an info tooltip on the label, so rows of fields stay aligned. */
  hint?: string;
  className?: string;
  inputClassName?: string;
  autoComplete?: string;
};

type FormControl = HTMLInputElement | HTMLTextAreaElement;

/**
 * Keeps a field's own value when the caller does not control it, and puts it
 * back to the default when the surrounding form is reset, as a native
 * uncontrolled input would.
 */
function useFieldValue<T extends FormControl>(
  value: string | number | undefined,
  defaultValue: string | number | undefined,
  onChange: ((value: string) => void) | undefined,
) {
  // A callback ref held in state, so the reset listener follows the mounted control.
  const [control, ref] = useState<T | null>(null);
  const [ownValue, setOwnValue] = useState(String(defaultValue ?? ""));
  const isControlled = value !== undefined;
  const onReset = useEffectEvent(() => {
    if (!isControlled) setOwnValue(String(defaultValue ?? ""));
  });

  useEffect(() => {
    const form = control?.form;
    if (!form) return;
    const handleReset = () => onReset();
    form.addEventListener("reset", handleReset);
    return () => form.removeEventListener("reset", handleReset);
  }, [control]);

  function update(next: string) {
    if (!isControlled) setOwnValue(next);
    onChange?.(next);
  }

  return {
    attach: ref,
    value: isControlled ? String(value) : ownValue,
    update,
  };
}

function toNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === "" || value === "any") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fieldStatus(error: string | undefined) {
  return error ? { type: "error" as const, message: error } : undefined;
}

function hintId(fieldId: string, hint: string | undefined) {
  return hint ? `${fieldId}-hint` : undefined;
}

/**
 * The label's info icon only opens on hover, so the hint is also the
 * control's accessible description for keyboard and screen-reader users.
 */
function HintDescription({ id, hint }: { id: string; hint?: string }) {
  return hint ? (
    <Text id={id} className="sr-only">
      {hint}
    </Text>
  ) : null;
}

export function FormField({
  label,
  name,
  id,
  type = "text",
  required,
  placeholder,
  defaultValue,
  value,
  onChange,
  min,
  step,
  error,
  hint,
  className,
  inputClassName,
  autoComplete,
}: FormFieldProps) {
  const fieldId = id ?? name;
  const field = useFieldValue<HTMLInputElement>(value, defaultValue, onChange);
  const { attach } = field;
  const status = fieldStatus(error);
  const describedBy = hintId(fieldId, hint);
  const description = <HintDescription id={`${fieldId}-hint`} hint={hint} />;

  if (type === "number") {
    const numericValue = toNumber(field.value);
    const shared = {
      ref: attach,
      id: fieldId,
      label,
      htmlName: name,
      value: numericValue,
      isRequired: required,
      placeholder,
      min: toNumber(min),
      step: toNumber(step),
      status,
      labelTooltip: hint,
      "aria-describedby": describedBy,
      autoComplete,
      containerClassName: cn(className),
      controlClassName: cn(inputClassName),
    };
    // Optional numbers can be emptied; required ones always hold a number.
    return (
      <>
        {required ? (
          <NumberInput {...shared} onChange={(next) => field.update(String(next))} />
        ) : (
          <NumberInput
            {...shared}
            hasClear
            onChange={(next) => field.update(next === null ? "" : String(next))}
          />
        )}
        {description}
      </>
    );
  }

  if (type === "date" || type === "datetime-local") {
    return (
      <Field
        label={label}
        inputID={fieldId}
        isRequired={required}
        labelTooltip={hint}
        status={status}
        statusVariant="detached"
        className={cn(className)}
      >
        <input
          ref={attach}
          id={fieldId}
          name={name}
          type={type}
          required={required}
          value={field.value}
          onChange={(event) => field.update(event.target.value)}
          min={min}
          step={step}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn("ops-native-input", inputClassName)}
        />
        {description}
      </Field>
    );
  }

  return (
    <>
      <TextInput
        ref={attach}
        id={fieldId}
        label={label}
        htmlName={name}
        type={type === "email" || type === "password" ? type : "text"}
        value={field.value}
        onChange={(next) => field.update(next)}
        isRequired={required}
        placeholder={placeholder}
        status={status}
        labelTooltip={hint}
        aria-describedby={describedBy}
        autoComplete={autoComplete}
        containerClassName={cn(className)}
        controlClassName={cn(inputClassName)}
      />
      {description}
    </>
  );
}

type TextAreaFieldProps = {
  label: string;
  name: string;
  id?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  /** Shown in an info tooltip on the label, so rows of fields stay aligned. */
  hint?: string;
  rows?: number;
  className?: string;
};

export function TextAreaField({
  label,
  name,
  id,
  required,
  placeholder,
  defaultValue,
  value,
  onChange,
  error,
  hint,
  rows = 3,
  className,
}: TextAreaFieldProps) {
  const fieldId = id ?? name;
  const field = useFieldValue<HTMLTextAreaElement>(
    value,
    defaultValue,
    onChange,
  );
  const { attach } = field;
  return (
    <>
      <TextArea
        ref={attach}
        id={fieldId}
        label={label}
        htmlName={name}
        value={field.value}
        onChange={(next) => field.update(next)}
        isRequired={required}
        placeholder={placeholder}
        rows={rows}
        status={fieldStatus(error)}
        labelTooltip={hint}
        aria-describedby={hintId(fieldId, hint)}
        containerClassName={cn(className)}
      />
      <HintDescription id={`${fieldId}-hint`} hint={hint} />
    </>
  );
}
