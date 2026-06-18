import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const AccordionContext = React.createContext<{ value: string | null; onValueChange: (value: string) => void }>({ value: null, onValueChange: () => {} });

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { type?: "single" | "multiple"; collapsible?: boolean; value?: string; onValueChange?: (value: string) => void; defaultValue?: string }
>(({ className, type = "single", collapsible = false, children, ...props }, ref) => {
  const [openValue, setOpenValue] = React.useState<string | null>(props.defaultValue || null);

  const handleValueChange = (value: string) => {
    if (collapsible && openValue === value) {
      setOpenValue(null);
    } else {
      setOpenValue(value);
    }
  };

  return (
    <AccordionContext.Provider value={{ value: openValue, onValueChange: handleValueChange }}>
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});
Accordion.displayName = "Accordion";

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => (
  <div ref={ref} className={cn("border-b", className)} data-value={value} {...props}>
    {React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        return React.cloneElement(child as React.ReactElement<any>, { itemValue: value });
      }
      return child;
    })}
  </div>
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { itemValue?: string }
>(({ className, children, itemValue, ...props }, ref) => {
  const { value, onValueChange } = React.useContext(AccordionContext);
  const isOpen = value === itemValue;

  return (
    <button
      ref={ref}
      className={cn(
        "flex flex-1 w-full items-center justify-between py-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180",
        className
      )}
      onClick={() => itemValue && onValueChange(itemValue)}
      data-state={isOpen ? "open" : "closed"}
      {...props}
    >
      {children}
      <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
    </button>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { itemValue?: string }
>(({ className, children, itemValue, ...props }, ref) => {
  const { value } = React.useContext(AccordionContext);
  const isOpen = value === itemValue;

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden text-sm transition-all pb-4 pt-0", className)}
      {...props}
    >
      {children}
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
