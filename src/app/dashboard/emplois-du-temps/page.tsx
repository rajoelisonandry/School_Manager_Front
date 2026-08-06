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
import {
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  Info,
  Wand2,
  Clock,
  AlertTriangle,
  Loader2,
  FileDown,
} from "lucide-react";
import { exportTimetablePdf, exportTeacherTimetablePdf } from "@/lib/pdf/timetable-pdf";
import {
  getTimetableEntries,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  generateTimetable,
  getTeacherAvailabilities,
  replaceTeacherAvailabilities,
  type TimetableEntryInput,
  type GenerateResult,
} from "./actions";
import { getClasses } from "../classes/actions";
import { getTeachers } from "../teachers/actions";
import { getSubjects } from "../subjects/actions";
import { PageHeader } from "@/components/page-header";
import { PageListSkeleton } from "@/components/loading-skeletons";

interface TimetableEntry {
  id: string;
  classId: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  subjectNames: string[];
  status: string;
}

interface SubjectOption {
  id: string;
  name: string;
  classIds: string[];
}

const DAYS = [
  { key: "lundi", label: "Lundi" },
  { key: "mardi", label: "Mardi" },
  { key: "mercredi", label: "Mercredi" },
  { key: "jeudi", label: "Jeudi" },
  { key: "vendredi", label: "Vendredi" },
  { key: "samedi", label: "Samedi" },
];

// Grille d'affichage à plages fixes d'1h, communes à toutes les classes.
const HOUR_ROWS = [
  "07:00", "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

const TIMETABLE_LEVELS = ["collège", "lycée"];
const ALL_TEACHERS = "all";
const ALL_CLASSES = "all";

const emptyFormData: TimetableEntryInput = {
  classId: "",
  teacherId: "",
  subjectId: "",
  dayOfWeek: "lundi",
  startTime: "",
  endTime: "",
  room: "",
};

type AvailabilityForm = Record<string, { startTime: string; endTime: string }>;

const emptyAvailabilityForm: AvailabilityForm = Object.fromEntries(
  DAYS.map((d) => [d.key, { startTime: "", endTime: "" }])
);

function addHour(time: string) {
  const [h, m] = time.split(":").map(Number);
  return `${String(h + 1).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Le backend renvoie le corps brut de l'erreur dans le message (ex: '... 409: {"message":"..."}')
function extractErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const jsonStart = raw.indexOf("{");
  if (jsonStart !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      if (typeof parsed.message === "string") return parsed.message;
      if (Array.isArray(parsed.message)) return parsed.message.join(", ");
    } catch {
      // ignore, on retombe sur le message générique
    }
  }
  return "Une erreur est survenue lors de l'enregistrement de ce cours.";
}

export default function EmploisDuTempsPage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [availabilities, setAvailabilities] = useState<
    { teacherId: string; dayOfWeek: string; startTime: string; endTime: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [formData, setFormData] = useState<TimetableEntryInput>(emptyFormData);

  const [availabilityTeacherId, setAvailabilityTeacherId] = useState("");
  const [availabilityForm, setAvailabilityForm] = useState<AvailabilityForm>(emptyAvailabilityForm);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(null);

  const [isTeacherPdfDialogOpen, setIsTeacherPdfDialogOpen] = useState(false);
  const [teacherPdfId, setTeacherPdfId] = useState(ALL_TEACHERS);
  const [isClassPdfDialogOpen, setIsClassPdfDialogOpen] = useState(false);
  const [classPdfId, setClassPdfId] = useState(ALL_CLASSES);

  const timetableClasses = classes.filter((c) => TIMETABLE_LEVELS.includes(c.level));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [entriesData, classesData, teachersData, subjectsData, availabilitiesData] =
      await Promise.all([
        getTimetableEntries(),
        getClasses(),
        getTeachers(),
        getSubjects(),
        getTeacherAvailabilities(),
      ]);
    setEntries(entriesData);
    setClasses(classesData);
    setTeachers(teachersData);
    setSubjects(subjectsData);
    setAvailabilities(availabilitiesData);
    setSelectedClassId((current) => {
      if (current) return current;
      const eligible = classesData.filter((c) => TIMETABLE_LEVELS.includes(c.level));
      return eligible[0]?.id ?? "";
    });
    setIsLoading(false);
  };

  // Ne proposer que les matières définies pour la classe sélectionnée : ça simplifie
  // la saisie et évite d'assigner une matière qui n'existe pas dans cette classe.
  const subjectsForClass = subjects.filter((s) => s.classIds.includes(selectedClassId));

  const resetForm = () => {
    setEditingEntry(null);
    setFormData({ ...emptyFormData, classId: selectedClassId });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  // Ouvre le dialogue d'ajout pré-rempli depuis une cellule vide de la grille d'une classe.
  const handleOpenCreateForCell = (
    classId: string,
    dayOfWeek: string,
    startTime: string,
    endTime: string
  ) => {
    setSelectedClassId(classId);
    setEditingEntry(null);
    setFormData({ ...emptyFormData, classId, dayOfWeek, startTime, endTime });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setFormData({
      classId: entry.classId,
      teacherId: entry.teacherId,
      subjectId: entry.subjectId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce cours de l'emploi du temps ?")) {
      await deleteTimetableEntry(id);
      loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = { ...formData, classId: selectedClassId };

    try {
      if (editingEntry) {
        await updateTimetableEntry(editingEntry.id, dataToSave);
      } else {
        await createTimetableEntry(dataToSave);
      }
    } catch (error) {
      alert(extractErrorMessage(error));
      return;
    }

    setIsDialogOpen(false);
    resetForm();
    loadData();
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find((t) => t.id === teacherId);
    return teacher ? `${teacher.lastName} ${teacher.firstName}` : "-";
  };

  // Un cours est enregistré même s'il tombe hors des disponibilités déclarées du
  // professeur (saisie manuelle) : on se contente de le signaler dans la grille.
  const matchesAvailability = (entry: TimetableEntry) => {
    if (!entry.teacherId) return true;
    return availabilities.some(
      (a) =>
        a.teacherId === entry.teacherId &&
        a.dayOfWeek === entry.dayOfWeek &&
        a.startTime <= entry.startTime &&
        a.endTime >= entry.endTime
    );
  };

  // Filet de sécurité côté affichage : le backend refuse déjà toute nouvelle création
  // ou modification en conflit, mais on signale ici aussi le moindre chevauchement
  // existant (ex: données créées avant l'ajout de cette règle).
  const isDoubleBooked = (entry: TimetableEntry) => {
    if (!entry.teacherId) return false;
    return entries.some(
      (other) =>
        other.id !== entry.id &&
        other.teacherId === entry.teacherId &&
        other.dayOfWeek === entry.dayOfWeek &&
        other.startTime < entry.endTime &&
        other.endTime > entry.startTime
    );
  };

  const dayLabel = (dayOfWeek: string) => DAYS.find((d) => d.key === dayOfWeek)?.label ?? dayOfWeek;
  const dayOrder = Object.fromEntries(DAYS.map((d, i) => [d.key, i]));
  const sortedAvailabilities = [...availabilities].sort((a, b) => {
    const nameCompare = getTeacherName(a.teacherId).localeCompare(getTeacherName(b.teacherId));
    if (nameCompare !== 0) return nameCompare;
    return dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
  });

  const handleAvailabilityTeacherChange = (teacherId: string) => {
    setAvailabilityTeacherId(teacherId);
    const form = { ...emptyAvailabilityForm };
    for (const a of availabilities.filter((x) => x.teacherId === teacherId)) {
      form[a.dayOfWeek] = { startTime: a.startTime, endTime: a.endTime };
    }
    setAvailabilityForm(form);
  };

  const handleAvailabilityFieldChange = (
    day: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setAvailabilityForm((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSaveAvailability = async () => {
    if (!availabilityTeacherId) return;
    setIsSavingAvailability(true);
    const payload = DAYS.filter(
      (d) => availabilityForm[d.key].startTime && availabilityForm[d.key].endTime
    ).map((d) => ({
      dayOfWeek: d.key,
      startTime: availabilityForm[d.key].startTime,
      endTime: availabilityForm[d.key].endTime,
    }));
    await replaceTeacherAvailabilities(availabilityTeacherId, payload);
    setIsSavingAvailability(false);
    loadData();
  };

  const handleDeleteAvailabilitySlot = async (teacherId: string, dayOfWeek: string) => {
    const remaining = availabilities
      .filter((a) => a.teacherId === teacherId && a.dayOfWeek !== dayOfWeek)
      .map((a) => ({ dayOfWeek: a.dayOfWeek, startTime: a.startTime, endTime: a.endTime }));
    await replaceTeacherAvailabilities(teacherId, remaining);
    loadData();
  };

  const handleGenerate = async () => {
    if (
      !confirm(
        "Ceci va recalculer entièrement l'emploi du temps de toutes les classes de collège et lycée, en remplaçant tous les cours actuels. Continuer ?"
      )
    ) {
      return;
    }
    setIsGenerating(true);
    const result = await generateTimetable();
    setGenerateResult(result);
    setIsGenerating(false);
    loadData();
  };

  const handleExportPdf = () => {
    const selected =
      classPdfId === ALL_CLASSES
        ? timetableClasses
        : timetableClasses.filter((c) => c.id === classPdfId);
    exportTimetablePdf(selected, entries);
    setIsClassPdfDialogOpen(false);
  };

  const handleExportTeacherPdf = () => {
    const selected =
      teacherPdfId === ALL_TEACHERS ? teachers : teachers.filter((t) => t.id === teacherPdfId);
    const teacherOptions = selected.map((t) => ({
      id: t.id,
      name: `${t.lastName} ${t.firstName}`,
    }));
    exportTeacherTimetablePdf(teacherOptions, entries, classes);
    setIsTeacherPdfDialogOpen(false);
  };

  if (isLoading) {
    return (
      <PageListSkeleton
        filters={1}
        tableCols={7}
        tableRows={5}
        tableHeaderControls={0}
        withHeaderActionButton
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          icon={CalendarClock}
          title="Emplois du Temps"
          subtitle="Collège et Lycée — disponibilités des professeurs et génération automatique"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  disabled={isGenerating || timetableClasses.length === 0}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {isGenerating ? "Génération..." : "Générer l'emploi du temps"}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-64">
              Remplit automatiquement chaque classe en croisant les matières et les
              disponibilités des professeurs. Remplace les cours existants
            </TooltipContent>
          </Tooltip>
          <Dialog open={isClassPdfDialogOpen} onOpenChange={setIsClassPdfDialogOpen}>
            <DialogTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  disabled={timetableClasses.length === 0}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Exporter PDF
                </Button>
              </span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exporter l&apos;emploi du temps</DialogTitle>
                <DialogDescription>
                  Choisissez une classe, ou exportez-les toutes (un tableau par classe,
                  récréations et pause déjeuner incluses, sans le nom des professeurs).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <label className="text-sm font-medium">Classe</label>
                <Select value={classPdfId} onValueChange={setClassPdfId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_CLASSES}>Toutes les classes</SelectItem>
                    {timetableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={handleExportPdf} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Générer le PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isTeacherPdfDialogOpen} onOpenChange={setIsTeacherPdfDialogOpen}>
            <DialogTrigger asChild>
              <span>
                <Button variant="outline" disabled={teachers.length === 0} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Exporter PDF (Professeurs)
                </Button>
              </span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exporter l&apos;emploi du temps des professeurs</DialogTitle>
                <DialogDescription>
                  Choisissez un professeur, ou exportez-les tous (un tableau par professeur).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <label className="text-sm font-medium">Professeur</label>
                <Select value={teacherPdfId} onValueChange={setTeacherPdfId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TEACHERS}>Tous les professeurs</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.lastName} {teacher.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button onClick={handleExportTeacherPdf} className="gap-2">
                  <FileDown className="h-4 w-4" />
                  Générer le PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <span>
                <Button onClick={handleOpenCreate} disabled={!selectedClassId}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un cours
                </Button>
              </span>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEntry ? "Modifier le cours" : "Ajouter un cours"}</DialogTitle>
                <DialogDescription>
                  {classes.find((c) => c.id === selectedClassId)?.name ?? ""}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Jour<span className="text-destructive">*</span>
                      </label>
                      <Select
                        value={formData.dayOfWeek}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, dayOfWeek: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day) => (
                            <SelectItem key={day.key} value={day.key}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-1.5">
                        Matière<span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-56">
                            Seules les matières définies pour cette classe apparaissent.
                            Ajoutez-en dans la page Matières si besoin
                          </TooltipContent>
                        </Tooltip>
                      </label>
                      <Select
                        value={formData.subjectId}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, subjectId: value }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une matière" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjectsForClass.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Heure de début<span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, startTime: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Heure de fin<span className="text-destructive">*</span>
                      </label>
                      <Input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, endTime: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      Professeur
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>Facultatif, à assigner plus tard si besoin</TooltipContent>
                      </Tooltip>
                    </label>
                    <Select
                      value={formData.teacherId || "none"}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          teacherId: value === "none" ? "" : value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Non assigné" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Non assigné</SelectItem>
                        {teachers
                          .filter((t) => t.status === "active")
                          .map((teacher) => (
                            <SelectItem key={teacher.id} value={teacher.id}>
                              {teacher.lastName} {teacher.firstName}
                              {teacher.subjectNames.length > 0
                                ? ` (${teacher.subjectNames.join(", ")})`
                                : ""}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Salle</label>
                    <Input
                      value={formData.room}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, room: e.target.value }))
                      }
                      placeholder="Ex: Salle 3"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-destructive">*</span> Champs obligatoires
                </p>
                <DialogFooter className="mt-2">
                  <Button type="submit">{editingEntry ? "Modifier" : "Ajouter"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {generateResult && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            generateResult.unfilled.length > 0
              ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
              : "border-green-300 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/40 dark:text-green-400"
          }`}
        >
          <div className="flex items-start gap-2">
            {generateResult.unfilled.length > 0 && (
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium">
                {generateResult.createdCount} cours généré
                {generateResult.createdCount > 1 ? "s" : ""}
                {generateResult.unfilled.length > 0 &&
                  ` — ${generateResult.unfilled.length} créneau${
                    generateResult.unfilled.length > 1 ? "x" : ""
                  } sans professeur disponible`}
              </p>
              {generateResult.unfilled.length > 0 && (
                <p className="mt-1 text-xs opacity-90">
                  Ajoutez des disponibilités ou des matières pour couvrir ces créneaux, par
                  exemple : {" "}
                  {generateResult.unfilled
                    .slice(0, 3)
                    .map((u) => `${u.className} (${u.dayOfWeek} ${u.startTime})`)
                    .join(", ")}
                  {generateResult.unfilled.length > 3 ? "…" : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            Disponibilités des professeurs
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Laissez les heures vides pour un jour où le professeur n&apos;est pas
                disponible. Ces disponibilités servent à la génération automatique
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <label className="text-sm font-medium">Professeur</label>
            <Select value={availabilityTeacherId} onValueChange={handleAvailabilityTeacherChange}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un professeur" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.lastName} {teacher.firstName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availabilityTeacherId && (
            <div className="space-y-3">
              <div className="grid gap-2">
                {DAYS.map((day) => (
                  <div key={day.key} className="flex items-center gap-3 flex-wrap">
                    <span className="w-24 text-sm font-medium shrink-0">{day.label}</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={availabilityForm[day.key].startTime}
                      onChange={(e) =>
                        handleAvailabilityFieldChange(day.key, "startTime", e.target.value)
                      }
                    />
                    <span className="text-muted-foreground text-sm">à</span>
                    <Input
                      type="time"
                      className="w-32"
                      value={availabilityForm[day.key].endTime}
                      onChange={(e) =>
                        handleAvailabilityFieldChange(day.key, "endTime", e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveAvailability} disabled={isSavingAvailability} size="sm">
                {isSavingAvailability ? "Enregistrement..." : "Enregistrer les disponibilités"}
              </Button>
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-sm font-medium pt-2">
              Disponibilités enregistrées ({sortedAvailabilities.length})
            </p>
            {sortedAvailabilities.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Aucune disponibilité enregistrée pour le moment.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Professeur</TableHead>
                      <TableHead>Jour</TableHead>
                      <TableHead>Début</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAvailabilities.map((a) => (
                      <TableRow key={`${a.teacherId}-${a.dayOfWeek}`}>
                        <TableCell className="font-medium">
                          {getTeacherName(a.teacherId)}
                        </TableCell>
                        <TableCell>{dayLabel(a.dayOfWeek)}</TableCell>
                        <TableCell>{a.startTime}</TableCell>
                        <TableCell>{a.endTime}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  handleDeleteAvailabilitySlot(a.teacherId, a.dayOfWeek)
                                }
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Supprimer cette disponibilité</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-muted-foreground">
          Classe pour l&apos;ajout manuel :
        </label>
        <Select value={selectedClassId} onValueChange={setSelectedClassId}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Sélectionner une classe" />
          </SelectTrigger>
          <SelectContent>
            {timetableClasses.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {timetableClasses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucune classe de collège ou lycée trouvée. Créez-en une dans la page Classes.
          </CardContent>
        </Card>
      ) : (
        timetableClasses.map((cls) => {
          const classEntries = entries.filter((e) => e.classId === cls.id);
          return (
            <Card key={cls.id}>
              <CardHeader>
                <CardTitle className="text-base">{cls.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Horaire</TableHead>
                        {DAYS.map((day) => (
                          <TableHead key={day.key} className="whitespace-nowrap">
                            {day.label}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {HOUR_ROWS.map((rowStart) => {
                        const rowEnd = addHour(rowStart);
                        return (
                          <TableRow key={rowStart}>
                            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {rowStart} – {rowEnd}
                            </TableCell>
                            {DAYS.map((day) => {
                              const entry = classEntries.find(
                                (e) =>
                                  e.dayOfWeek === day.key &&
                                  e.startTime >= rowStart &&
                                  e.startTime < rowEnd
                              );
                              return (
                                <TableCell key={day.key} className="align-top min-w-36">
                                  {entry ? (
                                    <div className="group relative rounded-md border border-border bg-muted/40 p-2">
                                      <div className="flex items-center gap-1">
                                        <p className="text-sm font-medium">{entry.subjectName}</p>
                                        {!matchesAvailability(entry) && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-56">
                                              Ce créneau ne correspond à aucune disponibilité
                                              déclarée pour {getTeacherName(entry.teacherId)}.
                                              Le cours est tout de même enregistré
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                        {isDoubleBooked(entry) && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-56">
                                              {getTeacherName(entry.teacherId)} est déjà assigné(e)
                                              à une autre classe sur ce créneau
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                      <p className="text-xs text-muted-foreground">
                                        {entry.startTime} – {entry.endTime}
                                      </p>
                                      {entry.teacherId && (
                                        <p className="text-xs text-muted-foreground">
                                          {getTeacherName(entry.teacherId)}
                                        </p>
                                      )}
                                      {entry.room && (
                                        <p className="text-xs text-muted-foreground">
                                          {entry.room}
                                        </p>
                                      )}
                                      <div className="mt-1 hidden gap-1 group-hover:flex">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleEdit(entry)}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => handleDelete(entry.id)}
                                        >
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenCreateForCell(cls.id, day.key, rowStart, rowEnd)
                                      }
                                      className="flex h-10 w-full items-center justify-center rounded-md text-muted-foreground/25 transition-colors hover:bg-muted/40 hover:text-muted-foreground"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
