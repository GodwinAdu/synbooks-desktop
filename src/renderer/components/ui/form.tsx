/**
 * Form component wrappers for react-hook-form
 * Provides FormField, FormItem, FormLabel, FormControl, FormMessage
 */

import * as React from "react";
import { Slot } from "radix-ui";
import { Controller, FormProvider, useFormContext, type ControllerProps, type FieldPath, type FieldValues } from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "./label";

const Form = FormProvider;

type FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = { name: TName };
const FormFieldContext = React.createContext<FormFieldContextValue>({} as FormFieldContextValue);

function FormField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>(props: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);
  return { name: fieldContext.name, ...fieldState };
};

type FormItemContextValue = { id: string };
const FormItemContext = React.createContext<FormItemContextValue>({} as FormItemContextValue);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("space-y-2", className)} {...props} />
    </FormItemContext.Provider>
  );
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error } = useFormField();
  return <Label data-slot="form-label" className={cn(error && "text-destructive", className)} {...props} />;
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
  const { error, name } = useFormField();
  return <Slot.Root data-slot="form-control" aria-invalid={!!error} aria-describedby={error ? `${name}-error` : undefined} {...props} />;
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="form-description" className={cn("text-muted-foreground text-xs", className)} {...props} />;
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error } = useFormField();
  const message = error?.message;
  if (!message) return null;
  return <p data-slot="form-message" className={cn("text-destructive text-xs font-medium", className)} {...props}>{String(message)}</p>;
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage, useFormField };
