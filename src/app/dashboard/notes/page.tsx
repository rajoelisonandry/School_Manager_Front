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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ClipboardList, Save, FileDown, Info, Loader2, Trophy, Trash2 } from "lucide-react";
import {
  getGrades,
  getGradeSessions,
  upsertGrades,
  deleteGrade,
  getBulletins,
  type Bulletin,
} from "./actions";
import { getClasses } from "../classes/actions";
import { getSubjects } from "../subjects/actions";
import { getStudents } from "../students/actions";
import { exportBulletinsPdf } from "@/lib/pdf/bulletin-pdf";
import { collectDsLabels, formatGrade } from "@/lib/bulletin";
import { PageHeader } from "@/components/page-header";
import { PageListSkeleton } from "@/components/loading-skeletons";
import { currentSchoolYear, schoolYearOptions } from "@/lib/school-year";
import { useAuth } from "@/lib/auth-context";

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

interface SubjectOption {
  id: string;
  name: string;
  classIds: string[];
}

interface StudentOption {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  classId: string;
  status: string;
}

const TRIMESTERS = [
  { value: "1", label: "1er Trimestre" },
  { value: "2", label: "2e Trimestre" },
  { value: "3", label: "3e Trimestre" },
];

// Sentinelle du <Select> pour "créer une nouvelle session de DS" (par opposition à
// la reprise d'une session existante comme "DS1", "DS2", ...).
const NEW_SESSION = "__new__";

// Sentinelle du sélecteur d'élève dans le popup d'export : exporte toute la classe.
const ALL_STUDENTS = "__all__";

type StudentSortBy = "numero" | "nom";
type BulletinSortBy = "numero" | "rang" | "nom";

// "Numéro" = matricule, comparé numériquement (ex: 9 avant 10) plutôt qu'en texte
// brut ("10" < "9" en comparaison de chaînes classique).
function compareMatricule(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

function compareName(a: { lastName: string; firstName: string }, b: { lastName: string; firstName: string }): number {
  return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
}

function sortStudents<T extends { matricule: string; lastName: string; firstName: string }>(
  list: T[],
  sortBy: StudentSortBy
): T[] {
  const sorted = [...list];
  if (sortBy === "nom") {
    sorted.sort(compareName);
  } else {
    sorted.sort((a, b) => compareMatricule(a.matricule, b.matricule));
  }
  return sorted;
}

function sortBulletins<T extends { matricule: string; lastName: string; firstName: string; rank: number | null }>(
  list: T[],
  sortBy: BulletinSortBy
): T[] {
  const sorted = [...list];
  if (sortBy === "nom") {
    sorted.sort(compareName);
  } else if (sortBy === "rang") {
    // Rang croissant (1er en premier) ; les élèves sans rang (pas encore de note) à la fin.
    sorted.sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
  } else {
    sorted.sort((a, b) => compareMatricule(a.matricule, b.matricule));
  }
  return sorted;
}

// Le backend renvoie le corps brut de l'erreur dans le message (ex: '... 404: {"message":"..."}')
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
  return "Une erreur est survenue lors de l'enregistrement des notes.";
}

export default function NotesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [schoolYear, setSchoolYear] = useState(currentSchoolYear());

  // Saisie des notes
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [trimester, setTrimester] = useState("1");
  const [type, setType] = useState<"ds" | "examen">("ds");
  const [sessions, setSessions] = useState<string[]>([]);
  const [sessionValue, setSessionValue] = useState(NEW_SESSION);
  const [newSessionLabel, setNewSessionLabel] = useState("DS1");
  const [gradeValues, setGradeValues] = useState<Record<string, string>>({});
  // Id de la note déjà enregistrée pour chaque élève dans la session actuelle (sert
  // à la supprimer individuellement, ex: en cas de réclamation sur une seule note).
  const [gradeIds, setGradeIds] = useState<Record<string, string>>({});
  const [isLoadingGrid, setIsLoadingGrid] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [studentsSortBy, setStudentsSortBy] = useState<StudentSortBy>("numero");

  // Bulletins
  const [bulletinClassId, setBulletinClassId] = useState("");
  const [bulletinTrimester, setBulletinTrimester] = useState("1");
  const [bulletinsSortBy, setBulletinsSortBy] = useState<BulletinSortBy>("numero");
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [isLoadingBulletins, setIsLoadingBulletins] = useState(false);
  const [showGradeDetails, setShowGradeDetails] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportStudentId, setExportStudentId] = useState(ALL_STUDENTS);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [classesData, subjectsData, studentsData] = await Promise.all([
      getClasses(),
      getSubjects(),
      getStudents(),
    ]);
    setClasses(classesData);
    setSubjects(subjectsData);
    setStudents(studentsData);
    setClassId((current) => current || classesData[0]?.id || "");
    setBulletinClassId((current) => current || classesData[0]?.id || "");
    setIsLoading(false);
  };

  const subjectsForClass = subjects.filter((s) => s.classIds.includes(classId));
  const studentsForClass = students.filter((s) => s.classId === classId && s.status === "active");
  const sortedStudentsForClass = sortStudents(studentsForClass, studentsSortBy);
  const sortedBulletins = sortBulletins(bulletins, bulletinsSortBy);
  // Colonnes communes (DS1, DS2, ...) pour l'aperçu détaillé à l'écran, alignées sur
  // celles utilisées dans l'export PDF détaillé.
  const dsLabels = collectDsLabels(bulletins);

  const effectiveLabel =
    type === "examen" ? "Examen" : sessionValue === NEW_SESSION ? newSessionLabel.trim() : sessionValue;

  // Recharge les sessions de DS déjà saisies à chaque changement de contexte, et
  // suggère la suivante ("DS1", "DS2", ...) par défaut.
  useEffect(() => {
    if (!classId || !subjectId || type !== "ds") {
      setSessions([]);
      return;
    }
    getGradeSessions({ classId, subjectId, schoolYear, trimester: Number(trimester), type }).then(
      (labels) => {
        setSessions(labels);
        setSessionValue(NEW_SESSION);
        setNewSessionLabel(`DS${labels.length + 1}`);
      }
    );
  }, [classId, subjectId, schoolYear, trimester, type]);

  // Recharge les notes déjà saisies pour la session actuellement sélectionnée.
  const reloadGrid = () => {
    if (!classId || !subjectId || !effectiveLabel) {
      setGradeValues({});
      setGradeIds({});
      return;
    }
    setIsLoadingGrid(true);
    return getGrades({
      classId,
      subjectId,
      schoolYear,
      trimester: Number(trimester),
      type,
      label: effectiveLabel,
    })
      .then((grades) => {
        const values: Record<string, string> = {};
        const ids: Record<string, string> = {};
        for (const g of grades) {
          values[g.studentId] = String(g.value);
          ids[g.studentId] = g.id;
        }
        setGradeValues(values);
        setGradeIds(ids);
      })
      .finally(() => setIsLoadingGrid(false));
  };

  useEffect(() => {
    reloadGrid();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, subjectId, schoolYear, trimester, type, effectiveLabel]);

  useEffect(() => {
    if (!bulletinClassId) {
      setBulletins([]);
      return;
    }
    setIsLoadingBulletins(true);
    getBulletins(bulletinClassId, schoolYear, Number(bulletinTrimester))
      .then(setBulletins)
      .finally(() => setIsLoadingBulletins(false));
  }, [bulletinClassId, schoolYear, bulletinTrimester]);

  const handleGradeChange = (studentId: string, value: string) => {
    setGradeValues((prev) => ({ ...prev, [studentId]: value }));
    setSaveMessage(null);
  };

  const handleSaveGrades = async () => {
    if (!classId || !subjectId || !effectiveLabel) return;

    const entries = studentsForClass
      .map((s) => ({ studentId: s.id, raw: gradeValues[s.id] }))
      .filter((e) => e.raw !== undefined && e.raw !== "")
      .map((e) => ({ studentId: e.studentId, value: Number(e.raw) }));

    if (entries.length === 0) {
      alert("Saisissez au moins une note avant d'enregistrer.");
      return;
    }
    if (entries.some((e) => Number.isNaN(e.value) || e.value < 0 || e.value > 20)) {
      alert("Les notes doivent être comprises entre 0 et 20.");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    try {
      await upsertGrades({
        classId,
        subjectId,
        schoolYear,
        trimester: Number(trimester),
        type,
        label: effectiveLabel,
        entries,
      });
      setSaveMessage(
        `${entries.length} note${entries.length > 1 ? "s" : ""} enregistrée${entries.length > 1 ? "s" : ""}.`
      );
      if (type === "ds" && !sessions.includes(effectiveLabel)) {
        setSessions((prev) => [...prev, effectiveLabel].sort());
        setSessionValue(effectiveLabel);
      }
      await reloadGrid();
      if (bulletinClassId === classId && bulletinTrimester === trimester) {
        getBulletins(bulletinClassId, schoolYear, Number(bulletinTrimester)).then(setBulletins);
      }
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  // Supprime la note d'un seul élève (ex: en cas de réclamation sur une note
  // précise), sans toucher aux notes des autres élèves de la session.
  const handleDeleteGrade = async (studentId: string) => {
    const gradeId = gradeIds[studentId];
    if (!gradeId) {
      // Pas encore enregistrée : on efface juste la saisie en cours.
      handleGradeChange(studentId, "");
      return;
    }
    if (!confirm("Supprimer cette note ? Cette action est irréversible.")) return;

    setDeletingStudentId(studentId);
    try {
      await deleteGrade(gradeId);
      setGradeValues((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setGradeIds((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
      setSaveMessage("Note supprimée.");
      if (bulletinClassId === classId && bulletinTrimester === trimester) {
        getBulletins(bulletinClassId, schoolYear, Number(bulletinTrimester)).then(setBulletins);
      }
    } catch (error) {
      alert(extractErrorMessage(error));
    } finally {
      setDeletingStudentId(null);
    }
  };

  const handleExportOne = (bulletin: Bulletin) => {
    const className = classes.find((c) => c.id === bulletinClassId)?.name ?? "";
    exportBulletinsPdf([bulletin], className, schoolYear, Number(bulletinTrimester), showGradeDetails);
  };

  // Popup d'export : un élève précis, ou toute la classe d'un coup.
  const handleExportFromDialog = () => {
    const selected =
      exportStudentId === ALL_STUDENTS
        ? bulletins
        : bulletins.filter((b) => b.studentId === exportStudentId);
    if (selected.length === 0) return;
    const className = classes.find((c) => c.id === bulletinClassId)?.name ?? "";
    exportBulletinsPdf(selected, className, schoolYear, Number(bulletinTrimester), showGradeDetails);
    setIsExportDialogOpen(false);
  };

  if (isLoading) {
    return (
      <PageListSkeleton
        filters={2}
        tableCols={5}
        tableRows={6}
        tableHeaderControls={1}
        withHeaderActionButton={false}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          icon={ClipboardList}
          title="Notes & Bulletins"
          subtitle="Saisir les notes de DS et d'examens trimestriels, puis générer les bulletins"
        />
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Année scolaire</label>
          <Select value={schoolYear} onValueChange={setSchoolYear}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schoolYearOptions().map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Saisie des notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <Select
                value={classId}
                onValueChange={(v) => {
                  setClassId(v);
                  setSubjectId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Matière</label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}>
                <SelectTrigger>
                  <SelectValue placeholder="Matière" />
                </SelectTrigger>
                <SelectContent>
                  {subjectsForClass.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trimestre</label>
              <Select value={trimester} onValueChange={setTrimester}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIMESTERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={(v) => setType(v as "ds" | "examen")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ds">Devoir Surveillé (DS)</SelectItem>
                  <SelectItem value="examen">Examen Trimestriel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type === "ds" && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  Session
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-56">
                      Un même trimestre peut avoir plusieurs DS (DS1, DS2, ...) : reprenez-en un
                      existant pour le corriger, ou créez-en un nouveau
                    </TooltipContent>
                  </Tooltip>
                </label>
                <Select value={sessionValue} onValueChange={setSessionValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                    <SelectItem value={NEW_SESSION}>+ Nouvelle session</SelectItem>
                  </SelectContent>
                </Select>
                {sessionValue === NEW_SESSION && (
                  <Input
                    value={newSessionLabel}
                    onChange={(e) => setNewSessionLabel(e.target.value)}
                    placeholder="Ex: DS1"
                  />
                )}
              </div>
            )}
          </div>

          {!classId || !subjectId ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Sélectionnez une classe et une matière pour saisir les notes
            </p>
          ) : studentsForClass.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun élève actif dans cette classe
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-end gap-2">
                <label className="text-sm text-muted-foreground">Trier par</label>
                <Select
                  value={studentsSortBy}
                  onValueChange={(v) => setStudentsSortBy(v as StudentSortBy)}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numero">Numéro</SelectItem>
                    <SelectItem value="nom">Nom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matricule</TableHead>
                      <TableHead>Élève</TableHead>
                      <TableHead className="w-32">Note / 20</TableHead>
                      <TableHead className="w-16 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudentsForClass.map((student) => {
                      // Une note déjà enregistrée ne peut être corrigée ou supprimée
                      // que par un administrateur (ex: en cas de réclamation) ; la
                      // saisie d'une note qui n'existe pas encore reste ouverte à tous.
                      const isLocked = !isAdmin && !!gradeIds[student.id];
                      const hasValue = (gradeValues[student.id] ?? "") !== "";
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="text-muted-foreground">{student.matricule}</TableCell>
                          <TableCell className="font-medium">
                            {student.lastName} {student.firstName}
                          </TableCell>
                          <TableCell>
                            {isLocked ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-block">
                                    <Input
                                      type="number"
                                      value={gradeValues[student.id] ?? ""}
                                      disabled
                                      className="w-24"
                                    />
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-56">
                                  Cette note est déjà enregistrée : seul un administrateur peut
                                  la modifier
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                step={0.25}
                                value={gradeValues[student.id] ?? ""}
                                onChange={(e) => handleGradeChange(student.id, e.target.value)}
                                disabled={isLoadingGrid}
                                className="w-24"
                                placeholder="-"
                              />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {!isLocked && hasValue && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteGrade(student.id)}
                                    disabled={deletingStudentId === student.id}
                                  >
                                    {deletingStudentId === student.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {gradeIds[student.id]
                                    ? "Supprimer cette note"
                                    : "Effacer la saisie (pas encore enregistrée)"}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSaveGrades}
                  disabled={isSaving || isLoadingGrid || !effectiveLabel}
                  className="gap-2"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSaving ? "Enregistrement..." : "Enregistrer les notes"}
                </Button>
                {saveMessage && (
                  <p className="text-sm text-green-600 dark:text-green-500">{saveMessage}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              Bulletins
            </CardTitle>
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
              <DialogTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    onClick={() => setExportStudentId(ALL_STUDENTS)}
                    disabled={bulletins.length === 0}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Exporter les bulletins
                  </Button>
                </span>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Exporter les bulletins</DialogTitle>
                  <DialogDescription>
                    Choisissez un élève, ou exportez toute la classe d&apos;un coup (un
                    bulletin par page).
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-2">
                  <label className="text-sm font-medium">Élève</label>
                  <SearchableSelect
                    value={exportStudentId}
                    onValueChange={setExportStudentId}
                    placeholder="Sélectionner un élève"
                    searchPlaceholder="Matricule, nom ou prénom..."
                    emptyMessage="Aucun élève trouvé"
                    options={[
                      {
                        value: ALL_STUDENTS,
                        label: `Tous les élèves de la classe (${bulletins.length})`,
                        keywords: "tous tout classe",
                      },
                      ...bulletins.map((b) => ({
                        value: b.studentId,
                        label: `${b.matricule} - ${b.lastName} ${b.firstName}`,
                        keywords: `${b.matricule} ${b.firstName} ${b.lastName}`,
                      })),
                    ]}
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleExportFromDialog} className="gap-2">
                    <FileDown className="h-4 w-4" />
                    Générer le PDF
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <Select value={bulletinClassId} onValueChange={setBulletinClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trimestre</label>
              <Select value={bulletinTrimester} onValueChange={setBulletinTrimester}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIMESTERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trier par</label>
              <Select
                value={bulletinsSortBy}
                onValueChange={(v) => setBulletinsSortBy(v as BulletinSortBy)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numero">Numéro</SelectItem>
                  <SelectItem value="rang">Rang</SelectItem>
                  <SelectItem value="nom">Nom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-2">
              <label className="text-sm font-medium">Affichage</label>
              <label className="flex h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={showGradeDetails}
                  onChange={(e) => setShowGradeDetails(e.target.checked)}
                />
                Afficher le détail de chaque note (DS1, DS2, ...)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-64">
                    Sans cette option, seule la moyenne générale apparaît ci-dessous et sur le
                    bulletin. Avec, le détail par matière et par DS s&apos;affiche ici et sur le
                    PDF exporté
                  </TooltipContent>
                </Tooltip>
              </label>
            </div>
          </div>

          {isLoadingBulletins ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : bulletins.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun élève actif dans cette classe
            </p>
          ) : showGradeDetails ? (
            <div className="space-y-4">
              {sortedBulletins.map((b) => (
                <div key={b.studentId} className="rounded-md border border-border p-3 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="font-medium">
                        {b.lastName} {b.firstName}{" "}
                        <span className="font-normal text-muted-foreground">({b.matricule})</span>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Moyenne générale : {formatGrade(b.generalAverage)} / 20
                        {b.rank !== null && ` — Rang ${b.rank} / ${b.totalStudents}`}
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" onClick={() => handleExportOne(b)}>
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Exporter le bulletin de cet élève</TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Matière</TableHead>
                          {dsLabels.map((label) => (
                            <TableHead key={label}>{label}</TableHead>
                          ))}
                          <TableHead>Examen</TableHead>
                          <TableHead>Moyenne</TableHead>
                          <TableHead>Coeff.</TableHead>
                          <TableHead>Moy. Classe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {b.subjects.map((s) => {
                          const dsByLabel = new Map(
                            s.grades.filter((g) => g.type === "ds").map((g) => [g.label, g.value])
                          );
                          return (
                            <TableRow key={s.subjectId}>
                              <TableCell className="font-medium">{s.subjectName}</TableCell>
                              {dsLabels.map((label) => (
                                <TableCell key={label}>{formatGrade(dsByLabel.get(label))}</TableCell>
                              ))}
                              <TableCell>{formatGrade(s.examValue)}</TableCell>
                              <TableCell>{formatGrade(s.subjectAverage)}</TableCell>
                              <TableCell>{s.coefficient}</TableCell>
                              <TableCell>{formatGrade(s.classSubjectAverage)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matricule</TableHead>
                    <TableHead>Élève</TableHead>
                    <TableHead>Moyenne Générale</TableHead>
                    <TableHead>Rang</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBulletins.map((b) => (
                    <TableRow key={b.studentId}>
                      <TableCell className="text-muted-foreground">{b.matricule}</TableCell>
                      <TableCell className="font-medium">
                        {b.lastName} {b.firstName}
                      </TableCell>
                      <TableCell>
                        {b.generalAverage !== null ? `${b.generalAverage.toFixed(2)} / 20` : "-"}
                      </TableCell>
                      <TableCell>
                        {b.rank !== null ? `${b.rank} / ${b.totalStudents}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleExportOne(b)}>
                              <FileDown className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Exporter le bulletin de cet élève</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
