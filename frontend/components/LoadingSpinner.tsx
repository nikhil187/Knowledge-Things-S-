"use client";

interface LoadingSpinnerProps {
  /** Accessible label for screen readers */
  label?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-6 h-6 border-2",
  md: "w-12 h-12 border-4",
  lg: "w-16 h-16 border-4",
};

export default function LoadingSpinner({ label = "Loading", size = "md" }: LoadingSpinnerProps) {
  return (
    <div
      className={`rounded-full border-violet-200 border-t-violet-500 animate-spin ${sizeClasses[size]}`}
      role="status"
      aria-label={label}
    />
  );
}
