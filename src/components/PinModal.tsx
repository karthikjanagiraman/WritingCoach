"use client";

import { useState, useCallback, useEffect } from "react";

type PinMode = "setup" | "verify";

interface PinModalProps {
  mode: PinMode;
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
  onSkip?: () => void; // Only for setup mode
}

export default function PinModal({ mode, open, onSuccess, onCancel, onSkip }: PinModalProps) {
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [firstPin, setFirstPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSetupStep(1);
      setFirstPin("");
      setCurrentPin("");
      setError("");
      setShaking(false);
      setSuccess(false);
      setLoading(false);
    }
  }, [open]);

  const triggerError = useCallback((msg: string) => {
    setError(msg);
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      setCurrentPin("");
    }, 600);
  }, []);

  const handleSetupComplete = useCallback(async (pin: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup", pin }),
      });
      if (!res.ok) {
        triggerError("Failed to save PIN. Try again.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => onSuccess(), 600);
    } catch {
      triggerError("Something went wrong. Try again.");
      setLoading(false);
    }
  }, [onSuccess, triggerError]);

  const handleVerify = useCallback(async (pin: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", pin }),
      });
      if (!res.ok) {
        triggerError("Wrong PIN. Try again.");
        setLoading(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => onSuccess(), 600);
    } catch {
      triggerError("Something went wrong. Try again.");
      setLoading(false);
    }
  }, [onSuccess, triggerError]);

  const enterDigit = useCallback((digit: string) => {
    if (loading || success) return;
    setError("");

    const newPin = currentPin + digit;
    if (newPin.length > 4) return;
    setCurrentPin(newPin);

    if (newPin.length === 4) {
      setTimeout(() => {
        if (mode === "setup") {
          if (setupStep === 1) {
            setFirstPin(newPin);
            setCurrentPin("");
            setSetupStep(2);
          } else {
            if (newPin === firstPin) {
              handleSetupComplete(newPin);
            } else {
              triggerError("PINs don't match. Try again.");
            }
          }
        } else {
          handleVerify(newPin);
        }
      }, 200);
    }
  }, [currentPin, mode, setupStep, firstPin, loading, success, handleSetupComplete, handleVerify, triggerError]);

  const clearPin = useCallback(() => {
    setCurrentPin("");
    setError("");
  }, []);

  const backspace = useCallback(() => {
    setCurrentPin((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  // Keyboard support
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") enterDigit(e.key);
      else if (e.key === "Backspace") backspace();
      else if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, enterDigit, backspace, onCancel]);

  if (!open) return null;

  const dots = Array.from({ length: 4 }, (_, i) => {
    const filled = i < currentPin.length;
    return (
      <div
        key={i}
        className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
          error && shaking
            ? "border-[#E74C3C] bg-[#E74C3C]"
            : filled
              ? "border-[#6C5CE7] bg-[#6C5CE7] scale-110"
              : "border-[#2D3436]/20 bg-transparent"
        }`}
      />
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: "blur(20px)", background: "rgba(45,52,54,0.5)" }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-[440px] mx-4 p-8 flex flex-col items-center"
        style={{
          animation: "pinPopIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {success ? (
          /* Success state */
          <div className="flex flex-col items-center py-8">
            <div
              className="w-16 h-16 rounded-full bg-[#00B894] flex items-center justify-center mb-4"
              style={{ animation: "pinPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            >
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-[#2D3436]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {mode === "setup" ? "PIN saved!" : "Welcome back!"}
            </p>
          </div>
        ) : (
          <>
            {/* Lock icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#6C5CE7]/[0.08] flex items-center justify-center mb-5">
              <svg className="w-7 h-7 text-[#6C5CE7]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            {/* Title */}
            <h2
              className="text-xl font-semibold text-[#2D3436] mb-2 text-center"
              style={{ fontFamily: "'Literata', serif" }}
            >
              {mode === "setup" ? "Set up your Parent PIN" : "Parent Dashboard"}
            </h2>

            {/* Description (setup only) */}
            {mode === "setup" && (
              <p className="text-sm text-[#2D3436]/50 text-center mb-5 max-w-[320px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                This PIN keeps your dashboard private. Your children will see a profile picker — only you can access reports and settings.
              </p>
            )}

            {/* Verify subtitle */}
            {mode === "verify" && (
              <p className="text-sm text-[#2D3436]/50 text-center mb-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Enter your 4-digit PIN
              </p>
            )}

            {/* Step indicators (setup only) */}
            {mode === "setup" && (
              <div className="flex items-center gap-4 mb-5">
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                    setupStep === 1
                      ? "bg-[#6C5CE7] text-white"
                      : "bg-[#00B894]/10 text-[#00B894]"
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {setupStep > 1 ? "\u2713" : "1."} Create PIN
                </span>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full transition-all ${
                    setupStep === 2
                      ? "bg-[#6C5CE7] text-white"
                      : "bg-[#2D3436]/[0.05] text-[#2D3436]/30"
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  2. Confirm PIN
                </span>
              </div>
            )}

            {/* Dynamic label (setup only) */}
            {mode === "setup" && (
              <p className="text-sm font-medium text-[#2D3436]/70 mb-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {setupStep === 1 ? "Choose a 4-digit PIN" : "Confirm your PIN"}
              </p>
            )}

            {/* PIN dots */}
            <div className={`flex items-center gap-4 mb-3 ${shaking ? "animate-pin-shake" : ""}`}>
              {dots}
            </div>

            {/* Error message */}
            <div className="h-6 flex items-center mb-3">
              {error && (
                <p className="text-xs font-medium text-[#E74C3C]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  {error}
                </p>
              )}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 mb-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button
                  key={d}
                  onClick={() => enterDigit(d)}
                  className="w-16 h-16 rounded-2xl bg-[#2D3436]/[0.03] hover:bg-[#2D3436]/[0.08] active:scale-95 flex items-center justify-center text-xl font-semibold text-[#2D3436] transition-all duration-150 select-none"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {d}
                </button>
              ))}
              <button
                key="clear"
                onClick={clearPin}
                className="w-16 h-16 rounded-2xl bg-transparent hover:bg-[#2D3436]/[0.05] flex items-center justify-center text-xs font-bold text-[#2D3436]/40 transition-all duration-150 select-none"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Clear
              </button>
              <button
                key="0"
                onClick={() => enterDigit("0")}
                className="w-16 h-16 rounded-2xl bg-[#2D3436]/[0.03] hover:bg-[#2D3436]/[0.08] active:scale-95 flex items-center justify-center text-xl font-semibold text-[#2D3436] transition-all duration-150 select-none"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                0
              </button>
              <button
                key="backspace"
                onClick={backspace}
                className="w-16 h-16 rounded-2xl bg-transparent hover:bg-[#2D3436]/[0.05] flex items-center justify-center text-[#2D3436]/40 transition-all duration-150 select-none"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                  <line x1="18" y1="9" x2="12" y2="15" />
                  <line x1="12" y1="9" x2="18" y2="15" />
                </svg>
              </button>
            </div>

            {/* Bottom actions */}
            {mode === "setup" && onSkip && (
              <button
                onClick={onSkip}
                className="text-sm font-medium text-[#2D3436]/40 hover:text-[#2D3436]/60 transition-colors mt-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Skip for now
              </button>
            )}
            {mode === "verify" && (
              <button
                onClick={onCancel}
                className="text-sm font-medium text-[#2D3436]/40 hover:text-[#2D3436]/60 transition-colors mt-2"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Cancel
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
