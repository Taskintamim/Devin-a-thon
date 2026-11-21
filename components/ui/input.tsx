import { cn } from "@/lib/utils";

export const fieldClass =
  "w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClass, "min-h-24 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClass, "h-10", className)} {...props} />;
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}
