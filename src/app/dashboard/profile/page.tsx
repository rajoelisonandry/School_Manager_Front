"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentUploadField } from "@/components/document-upload-field";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Shield, User as UserIcon } from "lucide-react";
import { updateMyProfile, uploadProfilePhoto } from "./actions";

const emptyFormData = {
  name: "",
  gender: "",
  email: "",
  username: "",
  profilePhotoUrl: "",
};

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState(emptyFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(
    null
  );

  useEffect(() => {
    if (!user) return;
    setFormData({
      name: user.name,
      gender: user.gender,
      email: user.email,
      username: user.username,
      profilePhotoUrl: user.profilePhotoUrl,
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      await updateMyProfile(formData);
      await refreshUser();
      setFeedback({ type: "success", message: "Profil mis à jour avec succès." });
    } catch {
      setFeedback({
        type: "error",
        message: "Échec de la mise à jour. Vérifiez vos informations et réessayez.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        icon={UserIcon}
        title="Mon Profil"
        subtitle="Modifier vos informations personnelles et votre photo de profil"
      />

      <Card>
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DocumentUploadField
              label="Photo de profil"
              value={formData.profilePhotoUrl}
              onChange={(url) => setFormData((prev) => ({ ...prev, profilePhotoUrl: url }))}
              uploadAction={uploadProfilePhoto}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nom Complet<span className="text-destructive">*</span>
              </label>
              <Input name="name" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Genre</label>
              <Select
                value={formData.gender || "unspecified"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    gender: value === "unspecified" ? "" : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unspecified">Non renseigné</SelectItem>
                  <SelectItem value="M">Homme</SelectItem>
                  <SelectItem value="F">Femme</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email<span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nom d&apos;utilisateur<span className="text-destructive">*</span>
              </label>
              <Input name="username" value={formData.username} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rôle</label>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                {user.role === "admin" ? "Administrateur" : "Contributeur"}
                <span className="text-xs">(non modifiable ici)</span>
              </div>
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
              {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Le changement de mot de passe se fait sur un écran séparé et demande de
              ressaisir votre mot de passe actuel.
            </p>
            <Button asChild variant="outline" className="shrink-0 gap-2">
              <Link href="/dashboard/profile/change-password">
                <KeyRound className="h-4 w-4" />
                Changer le mot de passe
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
