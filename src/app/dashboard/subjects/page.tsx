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
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MultiSelect } from "@/components/ui/multi-select";
import { Plus, Pencil, Trash2, Search, BookMarked, Info } from "lucide-react";
import {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  type ClassCoefficient,
} from "./actions";
import { getClasses } from "../classes/actions";
import { PageHeader } from "@/components/page-header";
import { PageListSkeleton } from "@/components/loading-skeletons";

interface Subject {
  id: string;
  name: string;
  classCoefficients: ClassCoefficient[];
  classIds: string[];
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

interface SubjectFormData {
  name: string;
  classCoefficients: ClassCoefficient[];
}

const emptyFormData: SubjectFormData = {
  name: "",
  classCoefficients: [],
};

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState<SubjectFormData>(emptyFormData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [subjectsData, classesData] = await Promise.all([getSubjects(), getClasses()]);
    setSubjects(subjectsData);
    setClasses(classesData);
    setIsLoading(false);
  };

  const getClassName = (classId: string) => classes.find((c) => c.id === classId)?.name;

  // Ex: "Terminale A (coef. 3), 6e A (coef. 2)" — un même coup d'œil sur les classes
  // concernées et le poids de la matière dans chacune.
  const getClassCoefficientSummary = (subject: Subject) =>
    subject.classCoefficients
      .map((cc) => {
        const name = getClassName(cc.classId);
        return name ? `${name} (coef. ${cc.coefficient})` : null;
      })
      .filter(Boolean)
      .join(", ");

  const filteredSubjects = subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      name: formData.name,
      classCoefficients: formData.classCoefficients,
    };

    if (editingSubject) {
      await updateSubject(editingSubject.id, dataToSave);
    } else {
      await createSubject(dataToSave);
    }

    resetForm();
    setIsDialogOpen(false);
    loadData();
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      classCoefficients: subject.classCoefficients,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette matière ?")) {
      await deleteSubject(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingSubject(null);
    setFormData(emptyFormData);
  };

  // Garde le coefficient déjà saisi pour les classes qui restent cochées, et
  // démarre à 1 pour toute classe nouvellement ajoutée.
  const handleClassSelectionChange = (values: string[]) => {
    setFormData((prev) => {
      const coefficientByClassId = new Map(
        prev.classCoefficients.map((cc) => [cc.classId, cc.coefficient])
      );
      return {
        ...prev,
        classCoefficients: values.map((classId) => ({
          classId,
          coefficient: coefficientByClassId.get(classId) ?? 1,
        })),
      };
    });
  };

  const handleCoefficientChange = (classId: string, coefficient: number) => {
    setFormData((prev) => ({
      ...prev,
      classCoefficients: prev.classCoefficients.map((cc) =>
        cc.classId === classId ? { ...cc, coefficient } : cc
      ),
    }));
  };

  const classOptions = classes.map((cls) => ({
    value: cls.id,
    label: cls.name,
    group: cls.level,
  }));

  if (isLoading) {
    return (
      <PageListSkeleton
        tableCols={3}
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
          icon={BookMarked}
          title="Gestion des Matières"
          subtitle="Définir les matières, les classes concernées et leur coefficient par classe"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle Matière
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? "Modifier la Matière" : "Nouvelle Matière"}
              </DialogTitle>
              <DialogDescription>
                {editingSubject
                  ? "Modifier le nom, les classes concernées ou leur coefficient"
                  : "Ajouter une nouvelle matière au système"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nom<span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex: Mathématiques"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Classes concernées
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">
                        Chaque classe peut avoir des matières différentes : sélectionnez
                        toutes les classes où cette matière est enseignée
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <MultiSelect
                    values={formData.classCoefficients.map((cc) => cc.classId)}
                    onValuesChange={handleClassSelectionChange}
                    options={classOptions}
                    placeholder="Sélectionner les classes"
                    searchPlaceholder="Rechercher une classe..."
                    emptyMessage="Aucune classe trouvée"
                  />
                </div>
                {formData.classCoefficients.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      Coefficient par classe
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-56">
                          Pondère cette matière dans la moyenne générale du bulletin : elle
                          peut peser différemment selon la classe
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <div className="space-y-1.5 rounded-md border border-border p-2">
                      {formData.classCoefficients.map((cc) => (
                        <div key={cc.classId} className="flex items-center justify-between gap-3">
                          <span className="text-sm truncate">
                            {getClassName(cc.classId) ?? cc.classId}
                          </span>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            className="w-20 shrink-0"
                            value={cc.coefficient}
                            onChange={(e) =>
                              handleCoefficientChange(cc.classId, Number(e.target.value) || 1)
                            }
                            required
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-destructive">*</span> Champs obligatoires
              </p>
              <DialogFooter className="mt-2">
                <Button type="submit">{editingSubject ? "Modifier" : "Créer"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Liste des Matières ({filteredSubjects.length})</CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une matière..."
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
                <TableHead>Matière</TableHead>
                <TableHead>Classes (coefficient)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell>{getClassCoefficientSummary(subject) || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(subject)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Modifier cette matière</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(subject.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Supprimer cette matière</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredSubjects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Aucune matière trouvée
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
