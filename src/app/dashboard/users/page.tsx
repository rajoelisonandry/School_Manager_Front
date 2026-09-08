"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Search, Shield, UserCog, Info } from "lucide-react";
import { getUsers, createUser, updateUser, deleteUser, uploadUserPhoto } from "./actions";
import { DocumentUploadField } from "@/components/document-upload-field";
import { PageHeader } from "@/components/page-header";
import { PageListSkeleton } from "@/components/loading-skeletons";
import { getCachedData, setCachedData } from "@/lib/page-data-cache";

interface User {
  id: string;
  username: string;
  password?: string;
  role: string;
  name: string;
  gender?: string;
  email: string;
  profilePhotoUrl?: string;
  createdAt: string;
}

const emptyFormData: Partial<User> = {
  username: "",
  password: "",
  role: "contributor",
  name: "",
  gender: "",
  email: "",
  profilePhotoUrl: "",
};

// Voir @/lib/page-data-cache : affiche instantanément les utilisateurs de la
// dernière visite pendant qu'un rafraîchissement silencieux se termine.
const CACHE_KEY = "users-page";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>(() => getCachedData<User[]>(CACHE_KEY) ?? []);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User>>(emptyFormData);
  const [isLoading, setIsLoading] = useState(() => getCachedData<User[]>(CACHE_KEY) === undefined);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    if (getCachedData<User[]>(CACHE_KEY) === undefined) setIsLoading(true);
    const data = await getUsers();
    setCachedData<User[]>(CACHE_KEY, data);
    setUsers(data);
    setIsLoading(false);
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <Shield className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-lg font-medium">Accès réservé aux administrateurs</p>
        <p className="text-sm text-muted-foreground">
          Vous n&apos;avez pas les droits nécessaires pour voir cette page.
        </p>
      </div>
    );
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      await updateUser(editingUser.id, formData);
    } else {
      await createUser(formData as Required<User>);
    }

    resetForm();
    setIsDialogOpen(false);
    loadData();
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: "",
      role: user.role,
      name: user.name,
      gender: user.gender ?? "",
      email: user.email,
      profilePhotoUrl: user.profilePhotoUrl ?? "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (id === currentUser?.id) {
      alert("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }
    if (confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ?")) {
      await deleteUser(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData(emptyFormData);
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Administrateur
        </span>
      );
    }
    return (
      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        Contributeur
      </span>
    );
  };

  if (isLoading) {
    return (
      <PageListSkeleton withStats statCount={2} tableCols={6} tableRows={5} tableHeaderControls={1} withHeaderActionButton />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          icon={UserCog}
          title="Gestion des Utilisateurs"
          subtitle="Gérer les accès au système"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingUser ? "Modifier l'Utilisateur" : "Nouvel Utilisateur"}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? "Modifier les informations de l'utilisateur"
                  : "Ajouter un nouvel utilisateur au syst ème"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <DocumentUploadField
                  label="Photo de profil"
                  value={formData.profilePhotoUrl ?? ""}
                  onChange={(url) =>
                    setFormData((prev) => ({ ...prev, profilePhotoUrl: url }))
                  }
                  uploadAction={uploadUserPhoto}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nom Complet<span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Genre
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">
                        Sert à afficher « Mr » ou « Mme » devant le prénom sur les
                        documents (ex: reçu de paiement)
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <Select
                    value={formData.gender || undefined}
                    onValueChange={(value) => handleSelectChange("gender", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Non renseigné" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Homme</SelectItem>
                      <SelectItem value="F">Femme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nom d&apos;utilisateur<span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Email<span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Mot de passe
                    {!editingUser && <span className="text-destructive">*</span>}{" "}
                    {editingUser && "(laisser vide pour ne pas changer)"}
                  </label>
                  <Input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    minLength={6}
                    required={!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Rôle
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-64">
                        Un Administrateur a accès à tout, y compris la gestion des
                        utilisateurs et les statistiques financières. Un Contributeur
                        peut enregistrer des élèves et des paiements, mais ne voit ni
                        les utilisateurs ni les statistiques de paiements.
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleSelectChange("role", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="contributor">Contributeur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <span className="text-destructive">*</span> Champs obligatoires
              </p>
              <DialogFooter className="mt-2">
                <Button type="submit">
                  {editingUser ? "Modifier" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Liste des Utilisateurs ({filteredUsers.length})</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Nom d'utilisateur</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Date de Création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {new Date(user.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Modifier cet utilisateur</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(user.id)}
                            disabled={user.id === currentUser?.id}
                          >
                            <Trash2
                              className={`h-4 w-4 ${
                                user.id === currentUser?.id
                                  ? "text-muted-foreground"
                                  : "text-destructive"
                              }`}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {user.id === currentUser?.id
                            ? "Vous ne pouvez pas supprimer votre propre compte"
                            : "Supprimer cet utilisateur"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun utilisateur trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Utilisateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{users.length}</div>
              <UserCog className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Administrateurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                {users.filter((u) => u.role === "admin").length}
              </div>
              <Shield className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
