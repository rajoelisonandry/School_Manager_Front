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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Eye,
  Info,
  UserX,
  FileDown,
  FileSpreadsheet,
  Users,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { getStudents, createStudent, updateStudent, deleteStudent, uploadStudentDocument } from "./actions";
import { getClasses } from "../classes/actions";
import { getPayments } from "../payments/actions";
import { exportStudentsPdf } from "@/lib/pdf/students-pdf";
import { exportStudentsExcel } from "@/lib/excel/students-excel";
import { EXPORT_COLUMNS, DEFAULT_EXPORT_COLUMNS, type ColumnKey } from "@/lib/export/student-columns";
import { DocumentUploadField } from "@/components/document-upload-field";
import { backendFileUrl } from "@/lib/backend/public-url";
import { PageHeader } from "@/components/page-header";
import { schoolYearOptions, schoolYearStart } from "@/lib/school-year";
import { PageListSkeleton } from "@/components/loading-skeletons";
import { getCachedData, setCachedData } from "@/lib/page-data-cache";

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  classId: string;
  gender: string;
  status: string;
  address: string;
  phones: string[];
  fatherName: string;
  fatherProfession: string;
  motherName: string;
  motherProfession: string;
  guardianName: string;
  guardianProfession: string;
  identityPhotoUrl: string;
  birthCertificateUrl: string;
  residenceCertificateUrl: string;
  createdAt: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const ALL_CLASSES = "all";
const ALL_YEARS = "all";

// Clé de cache mémoire (voir @/lib/page-data-cache) : affiche instantanément
// les données de la dernière visite le temps qu'un rafraîchissement silencieux
// se termine, au lieu de remontrer le squelette de chargement à chaque entrée
// sur la page.
const CACHE_KEY = "students-page";
interface StudentsPageCache {
  students: Student[];
  classes: ClassOption[];
  payments: Awaited<ReturnType<typeof getPayments>>;
}

// Largeur / hauteur de la boîte photo dans les PDF (carnet de correspondance,
// carte d'identité scolaire) : sert à cadrer la photo d'identité à l'envoi pour
// que l'aperçu du recadrage corresponde au rendu final dans les documents.
const ID_PHOTO_ASPECT_RATIO = 0.78;

const emptyFormData: Partial<Student> = {
  matricule: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  placeOfBirth: "",
  classId: "",
  gender: "M",
  status: "active",
  address: "",
  phones: [""],
  fatherName: "",
  fatherProfession: "",
  motherName: "",
  motherProfession: "",
  guardianName: "",
  guardianProfession: "",
  identityPhotoUrl: "",
  birthCertificateUrl: "",
  residenceCertificateUrl: "",
};

export default function StudentsPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [students, setStudents] = useState<Student[]>(
    () => getCachedData<StudentsPageCache>(CACHE_KEY)?.students ?? []
  );
  const [classes, setClasses] = useState<ClassOption[]>(
    () => getCachedData<StudentsPageCache>(CACHE_KEY)?.classes ?? []
  );
  const [payments, setPayments] = useState<Awaited<ReturnType<typeof getPayments>>>(
    () => getCachedData<StudentsPageCache>(CACHE_KEY)?.payments ?? []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState(ALL_CLASSES);
  const [schoolYearFilter, setSchoolYearFilter] = useState(ALL_YEARS);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>(emptyFormData);
  const [isLoading, setIsLoading] = useState(
    () => getCachedData<StudentsPageCache>(CACHE_KEY) === undefined
  );
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportColumns, setExportColumns] = useState<ColumnKey[]>(DEFAULT_EXPORT_COLUMNS);
  const [blankColumns, setBlankColumns] = useState<string[]>([]);
  const [newBlankColumnTitle, setNewBlankColumnTitle] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (getCachedData<StudentsPageCache>(CACHE_KEY) === undefined) setIsLoading(true);
    const [studentsData, classesData, paymentsData] = await Promise.all([
      getStudents(),
      getClasses(),
      getPayments(),
    ]);
    // Triés par date de création (plus ancien en premier), quel que soit l'ordre renvoyé par l'API.
    const sortedStudents = [...studentsData].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    setCachedData<StudentsPageCache>(CACHE_KEY, {
      students: sortedStudents,
      classes: classesData,
      payments: paymentsData,
    });
    setStudents(sortedStudents);
    setClasses(classesData);
    setPayments(paymentsData);
    setIsLoading(false);
  };

  const filteredStudents = students.filter((student) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      student.firstName.toLowerCase().includes(term) ||
      student.lastName.toLowerCase().includes(term) ||
      student.matricule.toLowerCase().includes(term);
    const matchesClass =
      classFilter === ALL_CLASSES || student.classId === classFilter;
    const matchesYear =
      schoolYearFilter === ALL_YEARS ||
      payments.some((p) => {
        if (p.studentId !== student.id) return false;
        const start = schoolYearStart(schoolYearFilter);
        return p.year === start || p.year === start + 1;
      });
    return matchesSearch && matchesClass && matchesYear;
  });

  // Sans filtre actif, on regroupe par classe (comme la page Classes) ; dès qu'un
  // filtre réduit la liste, un simple tableau à plat est plus lisible.
  const hasActiveFilter =
    classFilter !== ALL_CLASSES || schoolYearFilter !== ALL_YEARS || searchTerm.trim() !== "";

  const studentsByClass = new Map<string, Student[]>();
  for (const student of filteredStudents) {
    const key = student.classId || "unassigned";
    if (!studentsByClass.has(key)) studentsByClass.set(key, []);
    studentsByClass.get(key)!.push(student);
  }
  const classGroups = [
    ...classes
      .filter((cls) => studentsByClass.has(cls.id))
      .map((cls) => ({ id: cls.id, name: cls.name, students: studentsByClass.get(cls.id)! })),
    ...(studentsByClass.has("unassigned")
      ? [{ id: "unassigned", name: "Non assigné", students: studentsByClass.get("unassigned")! }]
      : []),
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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

    const cleanedPhones = (formData.phones ?? []).filter(
      (phone) => phone.trim() !== ""
    );
    const dataToSave = { ...formData, phones: cleanedPhones };

    if (editingStudent) {
      await updateStudent(editingStudent.id, dataToSave);
    } else {
      await createStudent(
        dataToSave as Required<Omit<Student, "id">>
      );
    }

    resetForm();
    setIsDialogOpen(false);
    loadData();
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    const { id, createdAt, ...editableFields } = student;
    void id;
    void createdAt;
    setFormData(editableFields);
    setIsDialogOpen(true);
  };

  const handleView = (student: Student) => {
    setViewingStudent(student);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (isAdmin) {
      if (confirm("Êtes-vous sûr de vouloir supprimer cet élève ?")) {
        await deleteStudent(id);
        loadData();
      }
      return;
    }
    if (confirm("Voulez-vous désactiver cet élève ? Seul un administrateur peut le supprimer définitivement.")) {
      await updateStudent(id, { status: "inactive" });
      loadData();
    }
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData(emptyFormData);
  };

  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    return cls ? cls.name : "Non assigné";
  };

  // "Classe" (voir EXPORT_COLUMNS) n'est pas un champ de base de l'élève : on
  // la calcule ici pour les deux exports, utile surtout en Excel où "toutes
  // les classes" tient sur une seule feuille à plat (le PDF, lui, groupe déjà
  // par classe via des pages séparées).
  const studentsForExport = filteredStudents.map((student) => ({
    ...student,
    className: getClassName(student.classId),
  }));

  const handleExportPdf = () => {
    exportStudentsPdf(
      studentsForExport,
      classes,
      classFilter === ALL_CLASSES ? null : classFilter,
      exportColumns,
      blankColumns
    );
    setIsExportDialogOpen(false);
  };

  const handleExportExcel = () => {
    exportStudentsExcel(
      studentsForExport,
      classes,
      classFilter === ALL_CLASSES ? null : classFilter,
      exportColumns,
      blankColumns
    );
    setIsExportDialogOpen(false);
  };

  const addExportColumn = (key: ColumnKey) => {
    setExportColumns((prev) => (prev.includes(key) ? prev : [...prev, key]));
  };

  const removeExportColumn = (key: ColumnKey) => {
    setExportColumns((prev) => prev.filter((k) => k !== key));
  };

  const moveExportColumn = (index: number, direction: -1 | 1) => {
    setExportColumns((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleAddBlankColumn = () => {
    const title = newBlankColumnTitle.trim();
    if (!title) return;
    setBlankColumns((prev) => [...prev, title]);
    setNewBlankColumnTitle("");
  };

  const handleRemoveBlankColumn = (index: number) => {
    setBlankColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const renderStudentsTable = (list: Student[], showClassColumn: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Numéro</TableHead>
          <TableHead>Matricule</TableHead>
          <TableHead>Nom Complet</TableHead>
          {showClassColumn && <TableHead>Classe</TableHead>}
          <TableHead>Naissance</TableHead>
          <TableHead>Téléphone(s)</TableHead>
          <TableHead>Père</TableHead>
          <TableHead>Mère</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map((student, index) => (
          <TableRow
            key={student.id}
            className="cursor-pointer"
            onClick={() => handleView(student)}
          >
            <TableCell className="text-muted-foreground">{index + 1}</TableCell>
            <TableCell className="font-medium">{student.matricule}</TableCell>
            <TableCell className="font-medium">
              {student.lastName} {student.firstName}
            </TableCell>
            {showClassColumn && <TableCell>{getClassName(student.classId)}</TableCell>}
            <TableCell>
              {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
              <div className="text-xs text-muted-foreground">
                {student.placeOfBirth}
              </div>
            </TableCell>
            <TableCell>{student.phones?.join(", ") || "-"}</TableCell>
            <TableCell>
              {student.fatherName || "-"}
              {student.fatherProfession && (
                <div className="text-xs text-muted-foreground">
                  {student.fatherProfession}
                </div>
              )}
            </TableCell>
            <TableCell>
              {student.motherName || "-"}
              {student.motherProfession && (
                <div className="text-xs text-muted-foreground">
                  {student.motherProfession}
                </div>
              )}
            </TableCell>
            <TableCell>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  student.status === "active"
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                }`}
              >
                {student.status === "active" ? "Actif" : "Inactif"}
              </span>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(student)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Voir le détail de l&apos;élève</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(student)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Modifier cet élève</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(student.id)}
                    >
                      {isAdmin ? (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      ) : (
                        <UserX className="h-4 w-4 text-amber-600" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isAdmin
                      ? "Supprimer cet élève"
                      : "Désactiver cet élève (seul un administrateur peut le supprimer)"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {list.length === 0 && (
          <TableRow>
            <TableCell
              colSpan={showClassColumn ? 10 : 9}
              className="text-center text-muted-foreground py-8"
            >
              Aucun élève trouvé
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  if (isLoading) {
    return (
      <PageListSkeleton
        tableCols={10}
        tableRows={6}
        tableHeaderControls={4}
        withHeaderActionButton
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          icon={Users}
          title="Gestion des Élèves"
          subtitle="Gérer les informations des élèves"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvel Élève
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Modifier l'Élève" : "Nouvel Élève"}
              </DialogTitle>
              <DialogDescription>
                {editingStudent
                  ? "Modifier les informations de l'élève"
                  : "Ajouter un nouvel élève au syst ème"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      Matricule
                      <span className="text-destructive">*</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Identifiant unique de l&apos;élève dans l&apos;établissement
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <Input
                      name="matricule"
                      value={formData.matricule}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Classe<span className="text-destructive">*</span>
                    </label>
                    <Select
                      value={formData.classId}
                      onValueChange={(value) => handleSelectChange("classId", value)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
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
                    <label className="text-sm font-medium">
                      Date de Naissance<span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Lieu de Naissance<span className="text-destructive">*</span>
                    </label>
                    <Input
                      name="placeOfBirth"
                      value={formData.placeOfBirth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Adresse</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Téléphone(s)
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Vous pouvez ajouter plusieurs numéros de contact
                      </TooltipContent>
                    </Tooltip>
                  </label>
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addPhoneField}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Ajouter un téléphone
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom du Père</label>
                    <Input
                      name="fatherName"
                      value={formData.fatherName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Profession du Père</label>
                    <Input
                      name="fatherProfession"
                      value={formData.fatherProfession}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom de la Mère</label>
                    <Input
                      name="motherName"
                      value={formData.motherName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Profession de la Mère</label>
                    <Input
                      name="motherProfession"
                      value={formData.motherProfession}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      Nom du Tuteur
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          À renseigner si un tuteur (autre que les parents) s&apos;occupe de l&apos;élève
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <Input
                      name="guardianName"
                      value={formData.guardianName}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Profession du Tuteur</label>
                    <Input
                      name="guardianProfession"
                      value={formData.guardianProfession}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border">
                  <p className="text-sm font-medium flex items-center gap-1.5 pt-2">
                    Documents
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">
                        Facultatif. Sur mobile, vous pouvez prendre une photo directement
                      </TooltipContent>
                    </Tooltip>
                  </p>
                </div>
                <DocumentUploadField
                  label="Photo d'identité"
                  value={formData.identityPhotoUrl ?? ""}
                  onChange={(url) => setFormData((prev) => ({ ...prev, identityPhotoUrl: url }))}
                  uploadAction={uploadStudentDocument}
                  cropAspectRatio={ID_PHOTO_ASPECT_RATIO}
                />
                <DocumentUploadField
                  label="Bulletin de naissance"
                  value={formData.birthCertificateUrl ?? ""}
                  onChange={(url) => setFormData((prev) => ({ ...prev, birthCertificateUrl: url }))}
                  uploadAction={uploadStudentDocument}
                />
                <DocumentUploadField
                  label="Certificat de résidence"
                  value={formData.residenceCertificateUrl ?? ""}
                  onChange={(url) => setFormData((prev) => ({ ...prev, residenceCertificateUrl: url }))}
                  uploadAction={uploadStudentDocument}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <span className="text-destructive">*</span> Champs obligatoires
              </p>
              <DialogFooter className="mt-2">
                <Button type="submit">
                  {editingStudent ? "Modifier" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewingStudent && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {viewingStudent.lastName} {viewingStudent.firstName}
                </DialogTitle>
                <DialogDescription>
                  Matricule {viewingStudent.matricule} · {getClassName(viewingStudent.classId)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      viewingStudent.status === "active"
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {viewingStudent.status === "active" ? "Actif" : "Inactif"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {viewingStudent.gender === "M" ? "Masculin" : "Féminin"}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Naissance
                  </h3>
                  <p className="text-sm">
                    {new Date(viewingStudent.dateOfBirth).toLocaleDateString("fr-FR")}
                    {" à "}
                    {viewingStudent.placeOfBirth}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Contact
                  </h3>
                  <p className="text-sm">{viewingStudent.address || "-"}</p>
                  <p className="text-sm text-muted-foreground">
                    {viewingStudent.phones?.length
                      ? viewingStudent.phones.join(", ")
                      : "Aucun numéro"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Père
                    </h3>
                    <p className="text-sm">{viewingStudent.fatherName || "-"}</p>
                    <p className="text-sm text-muted-foreground">
                      {viewingStudent.fatherProfession || "-"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Mère
                    </h3>
                    <p className="text-sm">{viewingStudent.motherName || "-"}</p>
                    <p className="text-sm text-muted-foreground">
                      {viewingStudent.motherProfession || "-"}
                    </p>
                  </div>
                </div>

                {viewingStudent.guardianName && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Tuteur
                    </h3>
                    <p className="text-sm">{viewingStudent.guardianName}</p>
                    <p className="text-sm text-muted-foreground">
                      {viewingStudent.guardianProfession || "-"}
                    </p>
                  </div>
                )}

                {(viewingStudent.identityPhotoUrl ||
                  viewingStudent.birthCertificateUrl ||
                  viewingStudent.residenceCertificateUrl) && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                      Documents
                    </h3>
                    <div className="flex gap-3 flex-wrap">
                      {[
                        { label: "Photo d'identité", url: viewingStudent.identityPhotoUrl },
                        { label: "Bulletin de naissance", url: viewingStudent.birthCertificateUrl },
                        { label: "Certificat de résidence", url: viewingStudent.residenceCertificateUrl },
                      ]
                        .filter((doc) => doc.url)
                        .map((doc) => (
                          <a
                            key={doc.label}
                            href={backendFileUrl(doc.url) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center gap-1"
                          >
                            <img
                              src={backendFileUrl(doc.url) ?? undefined}
                              alt={doc.label}
                              className={`h-16 rounded-md object-cover border border-border ${
                                doc.label === "Photo d'identité" ? "w-20" : "w-16"
                              }`}
                            />
                            <span
                              className={`text-xs text-muted-foreground text-center ${
                                doc.label === "Photo d'identité" ? "max-w-20" : "max-w-16"
                              }`}
                            >
                              {doc.label}
                            </span>
                          </a>
                        ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleEdit(viewingStudent);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Personnaliser l&apos;export</DialogTitle>
            <DialogDescription>
              Choisissez les colonnes à inclure et leur ordre, et ajoutez éventuellement
              des colonnes vides à remplir à la main — puis exportez en PDF ou en Excel.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div>
              <h3 className="text-sm font-medium mb-2">Classe à exporter</h3>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filtrer par classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLASSES}>Toutes les classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Colonnes (dans l&apos;ordre d&apos;impression)</h3>
              <div className="space-y-1.5">
                {exportColumns.length === 0 && (
                  <p className="text-sm text-muted-foreground">Aucune colonne sélectionnée.</p>
                )}
                {exportColumns.map((key, index) => {
                  const col = EXPORT_COLUMNS.find((c) => c.key === key);
                  if (!col) return null;
                  return (
                    <div
                      key={key}
                      className="flex items-center gap-1 rounded-md border border-input px-2 py-1.5 text-sm"
                    >
                      <span className="flex-1">{col.label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => moveExportColumn(index, -1)}
                        aria-label={`Monter ${col.label}`}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === exportColumns.length - 1}
                        onClick={() => moveExportColumn(index, 1)}
                        aria-label={`Descendre ${col.label}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => removeExportColumn(key)}
                        aria-label={`Retirer ${col.label}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {EXPORT_COLUMNS.some((c) => !exportColumns.includes(c.key)) && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">Ajouter une colonne :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPORT_COLUMNS.filter((c) => !exportColumns.includes(c.key)).map((col) => (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => addExportColumn(col.key)}
                        className="rounded-full border border-dashed border-input px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                      >
                        + {col.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Colonnes vides (à remplir à la main)</h3>
              <div className="flex gap-2">
                <Input
                  placeholder="Titre de la colonne (ex: Signature)"
                  value={newBlankColumnTitle}
                  onChange={(e) => setNewBlankColumnTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddBlankColumn();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddBlankColumn}>
                  Ajouter
                </Button>
              </div>
              {blankColumns.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {blankColumns.map((title, index) => (
                    <span
                      key={`${title}-${index}`}
                      className="flex items-center gap-1 rounded-full border border-input bg-muted px-3 py-1 text-xs"
                    >
                      {title}
                      <button
                        type="button"
                        onClick={() => handleRemoveBlankColumn(index)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Retirer la colonne ${title}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={exportColumns.length === 0 && blankColumns.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exporter Excel
            </Button>
            <Button
              onClick={handleExportPdf}
              disabled={exportColumns.length === 0 && blankColumns.length === 0}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Générer le PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>Liste des Élèves ({filteredStudents.length})</CardTitle>
            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto">
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrer par classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLASSES}>Toutes les classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Select value={schoolYearFilter} onValueChange={setSchoolYearFilter}>
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="Année scolaire" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_YEARS}>Toutes les années</SelectItem>
                        {schoolYearOptions().map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-56">
                  Filtre les élèves ayant au moins un paiement enregistré pour l&apos;année
                  scolaire sélectionnée
                </TooltipContent>
              </Tooltip>
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom ou matricule..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => setIsExportDialogOpen(true)}
                    disabled={filteredStudents.length === 0}
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Exporter
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {classFilter === ALL_CLASSES
                    ? "Exporter la liste en PDF ou Excel, groupée par classe"
                    : "Exporter la liste des élèves de cette classe en PDF ou Excel"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>
      </Card>

      {hasActiveFilter ? (
        <Card>
          <CardContent>{renderStudentsTable(filteredStudents, true)}</CardContent>
        </Card>
      ) : classGroups.length > 0 ? (
        classGroups.map((group) => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {group.name}
                <span className="text-sm font-normal text-muted-foreground">
                  ({group.students.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>{renderStudentsTable(group.students, false)}</CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Aucun élève trouvé
          </CardContent>
        </Card>
      )}
    </div>
  );
}
