"use client";

import { useState, useEffect } from "react";
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
import { Plus, Pencil, Trash2, Search, X, GraduationCap, Info } from "lucide-react";
import { getTeachers, createTeacher, updateTeacher, deleteTeacher } from "./actions";
import { getSubjects } from "../subjects/actions";
import { getClasses } from "../classes/actions";
import { PageHeader } from "@/components/page-header";
import { PageListSkeleton } from "@/components/loading-skeletons";
import { MultiSelect } from "@/components/ui/multi-select";
import { getCachedData, setCachedData } from "@/lib/page-data-cache";

interface Teacher {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  gender: string;
  status: string;
  subjectIds: string[];
  subjectNames: string[];
  classIds: string[];
  classNames: string[];
  email: string;
  phones: string[];
  createdAt: string;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

const emptyFormData: Partial<Teacher> = {
  matricule: "",
  firstName: "",
  lastName: "",
  gender: "M",
  status: "active",
  subjectIds: [],
  classIds: [],
  email: "",
  phones: [""],
};

interface TeachersPageCache {
  teachers: Teacher[];
  subjects: SubjectOption[];
  classes: ClassOption[];
}
// Voir @/lib/page-data-cache : affiche instantanément les données de la
// dernière visite pendant qu'un rafraîchissement silencieux se termine.
const CACHE_KEY = "teachers-page";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>(
    () => getCachedData<TeachersPageCache>(CACHE_KEY)?.teachers ?? []
  );
  const [subjects, setSubjects] = useState<SubjectOption[]>(
    () => getCachedData<TeachersPageCache>(CACHE_KEY)?.subjects ?? []
  );
  const [classes, setClasses] = useState<ClassOption[]>(
    () => getCachedData<TeachersPageCache>(CACHE_KEY)?.classes ?? []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>(emptyFormData);
  const [isLoading, setIsLoading] = useState(
    () => getCachedData<TeachersPageCache>(CACHE_KEY) === undefined
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (getCachedData<TeachersPageCache>(CACHE_KEY) === undefined) setIsLoading(true);
    const [teachersData, subjectsData, classesData] = await Promise.all([
      getTeachers(),
      getSubjects(),
      getClasses(),
    ]);
    setCachedData<TeachersPageCache>(CACHE_KEY, {
      teachers: teachersData,
      subjects: subjectsData,
      classes: classesData,
    });
    setTeachers(teachersData);
    setSubjects(subjectsData);
    setClasses(classesData);
    setIsLoading(false);
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const term = searchTerm.toLowerCase();
    return (
      teacher.firstName.toLowerCase().includes(term) ||
      teacher.lastName.toLowerCase().includes(term) ||
      teacher.matricule.toLowerCase().includes(term) ||
      teacher.subjectNames.some((s) => s.toLowerCase().includes(term)) ||
      teacher.classNames.some((c) => c.toLowerCase().includes(term))
    );
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneChange = (index: number, value: string) => {
    setFormData((prev) => {
      const phones = [...(prev.phones ?? [""])];
      phones[index] = value;
      return { ...prev, phones };
    });
  };

  const addPhoneField = () => {
    setFormData((prev) => ({ ...prev, phones: [...(prev.phones ?? []), ""] }));
  };

  const removePhoneField = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      phones: (prev.phones ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSave = {
      ...formData,
      phones: (formData.phones ?? []).filter((phone) => phone.trim() !== ""),
      subjectIds: formData.subjectIds ?? [],
      classIds: formData.classIds ?? [],
      email: formData.email?.trim() ? formData.email.trim() : undefined,
    };

    if (editingTeacher) {
      await updateTeacher(editingTeacher.id, dataToSave);
    } else {
      await createTeacher(
        dataToSave as Required<Omit<Teacher, "id" | "subjectNames" | "classNames">>
      );
    }

    resetForm();
    setIsDialogOpen(false);
    loadData();
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    const { id, subjectNames, classNames, createdAt, ...editableFields } = teacher;
    void id;
    void classNames;
    void subjectNames;
    void createdAt;
    setFormData(editableFields);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce professeur ?")) {
      await deleteTeacher(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingTeacher(null);
    setFormData(emptyFormData);
  };

  if (isLoading) {
    return (
      <PageListSkeleton
        tableCols={8}
        tableRows={6}
        tableHeaderControls={1}
        withHeaderActionButton
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          icon={GraduationCap}
          title="Gestion des Professeurs"
          subtitle="Gérer les enseignants et les matières qu'ils dispensent"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Professeur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? "Modifier le Professeur" : "Nouveau Professeur"}
              </DialogTitle>
              <DialogDescription>
                {editingTeacher
                  ? "Modifier les informations du professeur"
                  : "Ajouter un nouveau professeur au système"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Matricule<span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="matricule"
                      value={formData.matricule}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sexe</label>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => handleSelectChange("gender", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Nom<span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Prénom<span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Statut</label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleSelectChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Actif</SelectItem>
                        <SelectItem value="inactive">Inactif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Email{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        (optionnel)
                      </span>
                    </label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Classes enseignées
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Les classes où ce professeur donne cours
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <MultiSelect
                    values={formData.classIds ?? []}
                    onValuesChange={(values) =>
                      setFormData((prev) => ({ ...prev, classIds: values }))
                    }
                    options={classes.map((c) => ({ value: c.id, label: c.name, group: c.level }))}
                    placeholder="Sélectionner les classes"
                    searchPlaceholder="Rechercher une classe..."
                    emptyMessage="Aucune classe trouvée"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Matières enseignées
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Un professeur peut enseigner plusieurs matières, éventuellement dans
                        différentes classes
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <MultiSelect
                    values={formData.subjectIds ?? []}
                    onValuesChange={(values) =>
                      setFormData((prev) => ({ ...prev, subjectIds: values }))
                    }
                    options={subjects.map((s) => ({ value: s.id, label: s.name }))}
                    placeholder="Sélectionner les matières"
                    searchPlaceholder="Rechercher une matière..."
                    emptyMessage="Aucune matière trouvée. Créez-en une dans la page Matières"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Téléphone(s)</label>
                  <div className="space-y-2">
                    {(formData.phones ?? [""]).map((phone, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          value={phone}
                          onChange={(e) => handlePhoneChange(index, e.target.value)}
                          placeholder="Numéro de téléphone"
                        />
                        {(formData.phones ?? []).length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removePhoneField(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addPhoneField}>
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter un téléphone
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <span className="text-destructive">*</span> Champs obligatoires
              </p>
              <DialogFooter className="mt-2">
                <Button type="submit">{editingTeacher ? "Modifier" : "Créer"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Liste des Professeurs ({filteredTeachers.length})</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, matricule ou matière..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-72"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Matricule</TableHead>
                <TableHead>Nom Complet</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Matières</TableHead>
                <TableHead>Téléphone(s)</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">{teacher.matricule}</TableCell>
                  <TableCell className="font-medium">
                    {teacher.lastName} {teacher.firstName}
                  </TableCell>
                  <TableCell>{teacher.classNames.join(", ") || "-"}</TableCell>
                  <TableCell>{teacher.subjectNames.join(", ") || "-"}</TableCell>
                  <TableCell>{teacher.phones?.join(", ") || "-"}</TableCell>
                  <TableCell>{teacher.email || "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teacher.status === "active"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {teacher.status === "active" ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(teacher)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Modifier ce professeur</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(teacher.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Supprimer ce professeur</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTeachers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Aucun professeur trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
