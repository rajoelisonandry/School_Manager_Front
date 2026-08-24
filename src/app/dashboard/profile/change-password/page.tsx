"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { changeMyPassword } from "../actions";

const emptyFormData = {
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
};

export default function ChangePasswordPage() {
  const router = useRouter();
  const [formData, setFormData] = useState(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (formData.newPassword !== formData.confirmNewPassword) {
      setFeedback({
        type: "error",
        message: "Le nouveau mot de passe et sa confirmation ne correspondent pas.",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await changeMyPassword({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      if (result.success) {
        setFormData(emptyFormData);
        setFeedback({ type: "success", message: "Mot de passe changé avec succès." });
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Échec du changement de mot de passe. Réessayez.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Retour
      </Button>

      <PageHeader
        icon={KeyRound}
        title="Changer le mot de passe"
        subtitle="Pour votre sécurité, saisissez votre mot de passe actuel puis le nouveau à deux reprises"
      />

      <Card>
        <CardHeader>
          <CardTitle>Nouveau mot de passe</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Mot de passe actuel<span className="text-destructive">*</span>
              </label>
              <Input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                value={formData.currentPassword}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nouveau mot de passe<span className="text-destructive">*</span>
              </label>
              <Input
                type="password"
                name="newPassword"
                autoComplete="new-password"
                value={formData.newPassword}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Ressaisir le nouveau mot de passe<span className="text-destructive">*</span>
              </label>
              <Input
                type="password"
                name="confirmNewPassword"
                autoComplete="new-password"
                value={formData.confirmNewPassword}
                onChange={handleChange}
                minLength={6}
                required
              />
            </div>

            {feedback && (
              <div
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  feedback.type === "success"
                    ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                {feedback.message}
              </div>
            )}

            <Button type="submit" disabled={isSaving} className="gap-2">
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSaving ? "Changement..." : "Changer le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
