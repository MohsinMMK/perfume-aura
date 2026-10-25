"use client";

import { useCallback } from "react";

type NativeInputConstraints = {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  inputMode?: "text" | "numeric" | "email";
};

function setAttribute(
  input: HTMLInputElement,
  name: string,
  value: string | number | undefined,
) {
  if (value === undefined) input.removeAttribute(name);
  else input.setAttribute(name, String(value));
}

/**
 * Astryx TextInput does not forward native constraint attributes, so this ref
 * applies them to the rendered input. It keeps browser validation and the
 * mobile keyboard hint the auth forms relied on before.
 */
export function useNativeConstraints({
  required,
  minLength,
  maxLength,
  pattern,
  inputMode,
}: NativeInputConstraints) {
  return useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return;
      input.required = required ?? false;
      setAttribute(input, "minlength", minLength);
      setAttribute(input, "maxlength", maxLength);
      setAttribute(input, "pattern", pattern);
      setAttribute(input, "inputmode", inputMode);
    },
    [required, minLength, maxLength, pattern, inputMode],
  );
}
