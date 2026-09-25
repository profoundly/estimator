import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Turnstile, turnstileEnabled } from "@/components/Turnstile";

export interface ContactInfo {
  firstName: string;
  lastName: string;
  email: string;
  turnstileToken: string;
}

interface EmailCaptureModalProps {
  open: boolean;
  onSubmit: (contact: ContactInfo) => void;
}

export function EmailCaptureModal({ open, onSubmit }: EmailCaptureModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setErrors((prev) => {
      if (!prev.turnstile) return prev;
      const rest = { ...prev };
      delete rest.turnstile;
      return rest;
    });
  }, []);

  const handleExpire = useCallback(() => setTurnstileToken(""), []);

  const handleError = useCallback(() => {
    setTurnstileToken("");
    setErrors((prev) => ({
      ...prev,
      turnstile: "Verification failed. Please try again.",
    }));
  }, []);

  if (!open) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = "First name is required";
    if (!lastName.trim()) newErrors.lastName = "Last name is required";
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (turnstileEnabled && !turnstileToken) {
      newErrors.turnstile = "Please complete the verification";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      turnstileToken,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Unlock real pricing data for HubSpot help</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Data from 3,000+ proposals, broken down by category.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First name</Label>
              <input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name</Label>
              <input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Turnstile
              onVerify={handleVerify}
              onExpire={handleExpire}
              onError={handleError}
            />
            {errors.turnstile && (
              <p className="text-xs text-destructive text-center">{errors.turnstile}</p>
            )}
          </div>
          <Button type="submit" className="w-full">
            Unlock Pricing Data ✨
          </Button>
        </form>
      </div>
    </div>
  );
}
