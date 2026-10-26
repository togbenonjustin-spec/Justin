"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Lock, MessageSquare, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/loyerclair/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+229 97 00 11 22");
  const [channel, setChannel] = useState<"whatsapp" | "sms">("whatsapp");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, channel }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.retryAfterSeconds) {
          setCountdown(data.retryAfterSeconds);
        }
        setErrorMsg(data.message || data.error || "Veuillez patienter avant un nouvel envoi.");
        setLoading(false);
        return;
      }

      setInfoMsg(data.message);
      if (data.demoCode) {
        setDemoCode(data.demoCode);
      }
      setCountdown(30);
      setStep("otp");
      setTimeout(() => inputRefs.current[0]?.focus(), 120);
    } catch {
      setErrorMsg("Erreur réseau. Vérifiez votre connexion 3G/4G.");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }

    // Collage complet des 6 chiffres
    if (clean.length >= 6) {
      const split = clean.slice(0, 6).split("");
      setDigits(split);
      inputRefs.current[5]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean.slice(-1);
    setDigits(next);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = digits.join("");
    if (code.length !== 6) {
      setErrorMsg("Saisissez les 6 chiffres du code reçu.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/auth/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, role: "landlord" }),
      });
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setErrorMsg(data.error || "Code invalide ou expiré.");
        setLoading(false);
        return;
      }

      if (data.profile && !data.profile.onboarded) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch {
      setErrorMsg("Erreur de vérification.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto min-h-dvh max-w-[520px] px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card text-ink"
          aria-label="Retour à l'accueil"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="font-display text-xl font-extrabold">
          Loyer<span className="text-acc">Clair</span>
        </div>
        <ThemeToggle />
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {step === "phone" ? (
          <Card className="p-6">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pri/15 text-pri">
              <Phone className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-extrabold">
              Connexion sans mot de passe
            </h1>
            <p className="mt-1 text-sm text-mut">
              Entrez votre numéro béninois. Vous recevrez un code unique à 6
              chiffres par WhatsApp ou SMS.
            </p>

            <form onSubmit={handleRequestOtp} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="phone-input"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-mut"
                >
                  Numéro de téléphone (Bénin)
                </label>
                <Input
                  id="phone-input"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+229 97 00 11 22"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setChannel("whatsapp")}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold transition ${
                    channel === "whatsapp"
                      ? "border-pri bg-pri/10 text-pri"
                      : "border-line bg-bg text-mut"
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => setChannel("sms")}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 text-sm font-bold transition ${
                    channel === "sms"
                      ? "border-pri bg-pri/10 text-pri"
                      : "border-line bg-bg text-mut"
                  }`}
                >
                  <Phone className="h-4 w-4" />
                  SMS Classique
                </button>
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-bad/15 p-3 text-xs font-semibold text-bad">
                  {errorMsg}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Envoi en cours…" : "Recevoir mon code à 6 chiffres"}
              </Button>
            </form>

            <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-mut">
              <Lock className="h-3.5 w-3.5 text-ok" />
              Zéro mot de passe · Protection anti-énumération activée
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <h1 className="font-display text-2xl font-extrabold">
              Entrez les 6 chiffres
            </h1>
            <p className="mt-1 text-sm text-mut">
              Envoyé au <strong className="text-ink">{phone}</strong> via{" "}
              {channel === "whatsapp" ? "WhatsApp" : "SMS"}.
            </p>

            {infoMsg && (
              <div className="mt-3 rounded-xl bg-ok/15 p-3 text-xs font-semibold text-ok">
                {infoMsg}
              </div>
            )}

            {demoCode && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-acc/50 bg-acc/15 px-3 py-2 text-xs">
                <span>
                  Mode démo : code = <strong>{demoCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setDigits(demoCode.split(""))}
                  className="font-extrabold text-pri underline"
                >
                  Remplir en 1 clic
                </button>
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className="mt-5 space-y-5">
              <div
                className="grid grid-cols-6 gap-2"
                role="group"
                aria-label="Code OTP à 6 chiffres"
              >
                {digits.map((d, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={d}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    aria-label={`Chiffre ${idx + 1}`}
                    className="h-14 w-full rounded-2xl border-2 border-line bg-bg text-center font-mono text-2xl font-extrabold text-ink focus:border-pri focus:outline-none"
                  />
                ))}
              </div>

              {errorMsg && (
                <div className="rounded-xl bg-bad/15 p-3 text-xs font-semibold text-bad">
                  {errorMsg}
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                <CheckCircle2 className="h-5 w-5" />
                {loading ? "Vérification…" : "Valider et accéder"}
              </Button>

              <div className="flex items-center justify-between text-xs text-mut">
                <button
                  type="button"
                  onClick={() => setStep("phone")}
                  className="font-semibold text-pri underline"
                >
                  Changer de numéro
                </button>

                <button
                  type="button"
                  disabled={countdown > 0 || loading}
                  onClick={() => handleRequestOtp()}
                  className="font-semibold disabled:opacity-50"
                >
                  {countdown > 0
                    ? `Renvoyer le code (${countdown}s)`
                    : "Renvoyer un nouveau code"}
                </button>
              </div>
            </form>
          </Card>
        )}
      </motion.div>
    </main>
  );
}
