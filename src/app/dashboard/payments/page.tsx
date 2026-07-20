"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Search, Wallet, CheckCircle, Clock, Plus, Trash2, Info, Printer, Receipt, Scissors, X, DollarSign, ChevronLeft, ChevronRight, Pencil, ClipboardCheck, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { PageListSkeleton } from "@/components/loading-skeletons";
import { getPayments, getPaymentsPaginated, createPaymentBatch, deletePayment } from "./actions";
import { getStudents } from "../students/actions";
import { getPaymentTypes } from "../payment-types/actions";
import { getClasses } from "../classes/actions";
import { getPaymentTypeRates } from "../payment-type-rates/actions";
import { currentSchoolYear, schoolYearOptions, schoolYearStart, yearForMonth } from "@/lib/school-year";

interface Payment {
  id: string;
  receiptNumber: string;
  studentId: string;
  studentName: string;
  studentMatricule: string;
  paymentTypeId: string;
  paymentTypeName: string;
  recordedByName: string | null;
  month: string;
  year: number;
  amountPaid: number;
  amountDue: number;
  paymentDate: string;
}

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  matricule: string;
  classId: string;
}

interface PaymentTypeOption {
  id: string;
  name: string;
  amount: number;
}

interface ClassOption {
  id: string;
  name: string;
}

interface PaymentTypeRateOption {
  paymentTypeId: string;
  classId: string;
  year: number;
  amount: number;
}

interface LineItem {
  paymentTypeId: string;
  month: string;
  amountDue: number;
  amountPaid: number;
}

const emptyLineItem: LineItem = { paymentTypeId: "", month: "", amountDue: 0, amountPaid: 0 };

const emptyFormData = {
  classId: "",
  studentId: "",
  schoolYear: currentSchoolYear(),
  paymentDate: new Date().toISOString().split("T")[0],
  items: [{ ...emptyLineItem }] as LineItem[],
};

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

function ReceiptCopy({ payments, label }: { payments: Payment[]; label: string }) {
  const first = payments[0];
  const totalDue = payments.reduce((sum, p) => sum + p.amountDue, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amountPaid, 0);

  return (
    <div className="font-mono text-xs text-foreground">
      <div className="text-center">
        <p className="text-sm font-bold uppercase">Au Bel Enfant</p>
        <p className="italic text-muted-foreground">Ambition - Motivation - Réussite</p>
      </div>
      <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </p>
      <div className="my-1 border-t border-dashed border-foreground/30" />
      <p className="text-center font-semibold">REÇU DE PAIEMENT</p>
      <p className="text-center text-muted-foreground">
        N° {first.receiptNumber.padStart(6, "0")}
      </p>
      <div className="my-1 border-t border-dashed border-foreground/30" />

      <div className="space-y-1">
        <div className="flex justify-between gap-2">
          <span>Élève</span>
          <span className="text-right">{first.studentName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Matricule</span>
          <span>{first.studentMatricule}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Date</span>
          <span>{new Date(first.paymentDate).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>

      <div className="my-1 border-t border-dashed border-foreground/30" />

      <div className="space-y-1">
        {payments.map((p) => (
          <div key={p.id}>
            <div className="flex justify-between gap-2">
              <span>{p.paymentTypeName}</span>
              <span>{formatAriary(p.amountPaid)}</span>
            </div>
            <div className="flex justify-between gap-2 text-[10px] text-muted-foreground">
              <span className="capitalize">
                {p.month} {p.year}
              </span>
              {p.amountPaid < p.amountDue && <span>dû {formatAriary(p.amountDue)}</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="my-1 border-t border-dashed border-foreground/30" />

      <div className="space-y-1">
        <div className="flex justify-between gap-2 font-bold">
          <span>Total Payé</span>
          <span>{formatAriary(totalPaid)}</span>
        </div>
        {totalDue > totalPaid && (
          <div className="flex justify-between gap-2">
            <span>Reste</span>
            <span>{formatAriary(totalDue - totalPaid)}</span>
          </div>
        )}
      </div>

      <div className="my-1 border-t border-dashed border-foreground/30" />

      <p className="text-center text-[10px] text-muted-foreground">
        Enregistré par {first.recordedByName ?? "-"}
      </p>

      <div className="my-1 border-t border-dashed border-foreground/30" />

      <p className="text-center font-semibold">Merci de votre confiance !</p>
    </div>
  );
}

const HISTORY_LIMIT = 10;

export default function PaymentsPage() {
  const { user: currentUser } = useAuth();
  const canSeeStats = currentUser?.role === "admin";
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [rates, setRates] = useState<PaymentTypeRateOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(emptyFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptPayments, setReceiptPayments] = useState<Payment[] | null>(null);

  const [historyItems, setHistoryItems] = useState<Payment[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    setHistoryPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    loadHistory(historyPage, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyPage, debouncedSearch]);

  const loadHistory = async (page: number, search: string) => {
    setIsHistoryLoading(true);
    const result = await getPaymentsPaginated(page, HISTORY_LIMIT, search || undefined);
    setHistoryItems(result.items);
    setHistoryTotal(result.total);
    setHistoryTotalPages(result.totalPages);
    setIsHistoryLoading(false);
  };

  const loadData = async () => {
    setIsLoading(true);
    const [paymentsData, studentsData, typesData, classesData, ratesData] = await Promise.all([
      getPayments(),
      getStudents(),
      getPaymentTypes(),
      getClasses(),
      getPaymentTypeRates(),
    ]);
    setPayments(paymentsData);
    setStudents(studentsData);
    setPaymentTypes(typesData);
    setClasses(classesData);
    setRates(ratesData);
    setIsLoading(false);
  };

  // Le tarif spécifique (classe + année scolaire) prime sur le montant par défaut du type de paiement
  const resolveAmount = (classId: string, paymentTypeId: string, schoolYearStartYear: number) => {
    const rate = rates.find(
      (r) =>
        r.classId === classId &&
        r.paymentTypeId === paymentTypeId &&
        r.year === schoolYearStartYear
    );
    if (rate) return rate.amount;
    const type = paymentTypes.find((t) => t.id === paymentTypeId);
    return type?.amount ?? 0;
  };

  const studentsForForm = formData.classId
    ? students.filter((s) => s.classId === formData.classId)
    : students;

  const handleClassChange = (classId: string) => {
    setFormData((prev) => ({
      ...prev,
      classId,
      studentId: "",
      items: prev.items.map((item) =>
        item.paymentTypeId
          ? {
              ...item,
              amountDue: resolveAmount(classId, item.paymentTypeId, schoolYearStart(prev.schoolYear)),
              amountPaid: resolveAmount(classId, item.paymentTypeId, schoolYearStart(prev.schoolYear)),
            }
          : item
      ),
    }));
  };

  const handleSchoolYearChange = (schoolYear: string) => {
    setFormData((prev) => ({
      ...prev,
      schoolYear,
      items: prev.items.map((item) =>
        item.paymentTypeId
          ? {
              ...item,
              amountDue: resolveAmount(prev.classId, item.paymentTypeId, schoolYearStart(schoolYear)),
              amountPaid: resolveAmount(prev.classId, item.paymentTypeId, schoolYearStart(schoolYear)),
            }
          : item
      ),
    }));
  };

  const handleItemTypeChange = (index: number, paymentTypeId: string) => {
    setFormData((prev) => {
      const amount = resolveAmount(prev.classId, paymentTypeId, schoolYearStart(prev.schoolYear));
      return {
        ...prev,
        items: prev.items.map((item, i) =>
          i === index ? { ...item, paymentTypeId, amountDue: amount, amountPaid: amount } : item
        ),
      };
    });
  };

  const handleItemMonthChange = (index: number, month: string) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, month } : item)),
    }));
  };

  const handleItemAmountChange = (
    index: number,
    field: "amountDue" | "amountPaid",
    value: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const addItem = () => {
    setFormData((prev) => ({ ...prev, items: [...prev.items, { ...emptyLineItem }] }));
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const totalPaidInForm = formData.items.reduce((sum, item) => sum + item.amountPaid, 0);

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDialogOpen(false);
    setIsPreviewOpen(true);
  };

  const handleEditFromPreview = () => {
    setIsPreviewOpen(false);
    setIsDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    const created = await createPaymentBatch({
      studentId: formData.studentId,
      recordedByUserId: currentUser?.id,
      paymentDate: formData.paymentDate,
      items: formData.items.map((item) => ({
        paymentTypeId: item.paymentTypeId,
        month: item.month,
        year: yearForMonth(formData.schoolYear, item.month),
        amountDue: item.amountDue,
        amountPaid: item.amountPaid,
      })),
    });

    setIsSaving(false);
    setIsPreviewOpen(false);
    resetForm();
    loadData();
    setHistoryPage(1);
    loadHistory(1, debouncedSearch);
    setReceiptPayments(created);
  };

  const handleReprint = (payment: Payment) => {
    const group = payments.filter((p) => p.receiptNumber === payment.receiptNumber);
    setReceiptPayments(group.length > 0 ? group : [payment]);
  };

  const handlePrintReceipt = () => {
    document.body.classList.add("print-receipt");
    const cleanup = () => {
      document.body.classList.remove("print-receipt");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  };

  const handleDelete = async (id: string) => {
    if (!canSeeStats) return;
    if (confirm("Êtes-vous sûr de vouloir supprimer ce paiement ?")) {
      await deletePayment(id);
      loadData();
      const nextPage = historyItems.length === 1 && historyPage > 1 ? historyPage - 1 : historyPage;
      setHistoryPage(nextPage);
      loadHistory(nextPage, debouncedSearch);
    }
  };

  const resetForm = () => {
    setFormData(emptyFormData);
  };

  const getStatus = (payment: Payment) => {
    if (payment.amountPaid >= payment.amountDue) {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
          <CheckCircle className="h-4 w-4" />
          Payé
        </span>
      );
    }
    if (payment.amountPaid > 0) {
      return (
        <span className="flex items-center gap-1 text-amber-600 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Partiel
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
        <Clock className="h-4 w-4" />
        En attente
      </span>
    );
  };

  const totalCollected = payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const totalExpected = payments.reduce((sum, p) => sum + p.amountDue, 0);
  const totalPending = totalExpected - totalCollected;

  if (isLoading) {
    return (
      <PageListSkeleton
        withStats
        statCount={3}
        tableCols={9}
        tableRows={HISTORY_LIMIT}
        tableHeaderControls={1}
        withHeaderActionButton
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          icon={DollarSign}
          title="Paiements des Élèves"
          subtitle="Écolage, frais généraux, excursions et autres paiements (en Ariary)"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Paiement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enregistrer un Paiement</DialogTitle>
              <DialogDescription>
                Un même reçu peut regrouper plusieurs types de frais (Écolage, Frais
                généraux, Excursion...)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleReviewSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Classe
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Filtre la liste des élèves ci-dessous et applique le tarif de cette classe
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <Select value={formData.classId} onValueChange={handleClassChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrer par classe" />
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Élève<span className="text-destructive">*</span>
                  </label>
                  <SearchableSelect
                    value={formData.studentId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, studentId: value }))
                    }
                    placeholder="Sélectionner un élève"
                    searchPlaceholder="Matricule, nom ou prénom..."
                    emptyMessage="Aucun élève dans cette classe"
                    options={studentsForForm.map((student) => ({
                      value: student.id,
                      label: `${student.matricule} - ${student.firstName} ${student.lastName}`,
                      keywords: `${student.matricule} ${student.firstName} ${student.lastName}`,
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Année scolaire
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">
                        Septembre à Décembre comptent pour la première année,
                        Janvier à Juin pour la seconde
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <Select value={formData.schoolYear} onValueChange={handleSchoolYearChange}>
                    <SelectTrigger>
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

                <div className="space-y-3 border-t border-border pt-3">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Types de Paiement<span className="text-destructive">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">
                        Ajoutez plusieurs lignes pour les regrouper sur un même reçu. Un même
                        type peut revenir plusieurs fois avec des mois différents (ex : Écolage
                        Mai et Écolage Juin)
                      </TooltipContent>
                    </Tooltip>
                  </label>

                  {formData.items.map((item, index) => (
                    <div key={index} className="space-y-2 rounded-md border border-border p-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={item.paymentTypeId}
                          onValueChange={(value) => handleItemTypeChange(index, value)}
                          required
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                          <SelectContent>
                            {paymentTypes.map((type) => {
                              const amount = formData.classId
                                ? resolveAmount(
                                    formData.classId,
                                    type.id,
                                    schoolYearStart(formData.schoolYear)
                                  )
                                : type.amount;
                              return (
                                <SelectItem key={type.id} value={type.id}>
                                  {type.name} - {formatAriary(amount)}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <Input
                          value={item.month}
                          onChange={(e) => handleItemMonthChange(index, e.target.value)}
                          placeholder="Mois (ex: Mai)"
                          className="w-36"
                          required
                        />
                        {formData.items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Montant Dû</label>
                          <Input
                            type="number"
                            value={item.amountDue}
                            onChange={(e) =>
                              handleItemAmountChange(index, "amountDue", Number(e.target.value))
                            }
                            min="0"
                            required
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Montant Payé</label>
                          <Input
                            type="number"
                            value={item.amountPaid}
                            onChange={(e) =>
                              handleItemAmountChange(index, "amountPaid", Number(e.target.value))
                            }
                            min="0"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter une ligne
                  </Button>

                  <p className="text-sm font-medium text-right">
                    Total payé : {formatAriary(totalPaidInForm)}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Date de Paiement<span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <span className="text-destructive">*</span> Champs obligatoires
              </p>
              <DialogFooter className="mt-2">
                <Button type="submit" className="gap-2">
                  <ClipboardCheck className="h-4 w-4" />
                  Vérifier avant d&apos;enregistrer
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pre-save preview */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Aperçu avant enregistrement
            </DialogTitle>
            <DialogDescription>
              Vérifiez les informations ci-dessous avant de confirmer. Rien n&apos;est encore
              enregistré.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              Ce paiement n&apos;est pas encore enregistré. Relisez chaque ligne pour éviter
              une erreur de saisie.
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Élève</p>
                <p className="font-medium">
                  {(() => {
                    const student = students.find((s) => s.id === formData.studentId);
                    return student
                      ? `${student.matricule} - ${student.firstName} ${student.lastName}`
                      : "-";
                  })()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Date de paiement</p>
                <p className="font-medium">
                  {formData.paymentDate
                    ? new Date(formData.paymentDate).toLocaleDateString("fr-FR")
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Année scolaire</p>
                <p className="font-medium">{formData.schoolYear}</p>
              </div>
            </div>

            <div className="rounded-md border border-border divide-y divide-border">
              {formData.items.map((item, index) => {
                const type = paymentTypes.find((t) => t.id === item.paymentTypeId);
                return (
                  <div key={index} className="flex items-center justify-between px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{type?.name ?? "-"}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.month}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatAriary(item.amountPaid)}</p>
                      {item.amountPaid < item.amountDue && (
                        <p className="text-xs text-muted-foreground">
                          dû {formatAriary(item.amountDue)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-sm font-semibold pt-1">
              <span>Total payé</span>
              <span>{formatAriary(totalPaidInForm)}</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={handleEditFromPreview} className="gap-2">
              <Pencil className="h-4 w-4" />
              Modifier
            </Button>
            <Button onClick={handleConfirmSave} disabled={isSaving} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {isSaving ? "Enregistrement..." : "Confirmer et Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt preview */}
      <Dialog open={!!receiptPayments} onOpenChange={(open) => !open && setReceiptPayments(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Aperçu du reçu
            </DialogTitle>
            <DialogDescription>
              Vérifiez le reçu avant de l&apos;imprimer
            </DialogDescription>
          </DialogHeader>

          {receiptPayments && (
            <div className="mx-auto max-h-[65vh] w-full max-w-[280px] overflow-y-auto rounded-md border border-dashed border-foreground/30 bg-card p-4">
              <ReceiptCopy payments={receiptPayments} label="Exemplaire Client" />

              <div className="my-4 flex items-center gap-2 text-muted-foreground">
                <div className="flex-1 border-t border-dashed border-foreground/40" />
                <Scissors className="h-3 w-3 shrink-0" />
                <div className="flex-1 border-t border-dashed border-foreground/40" />
              </div>

              <ReceiptCopy payments={receiptPayments} label="Exemplaire École" />
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setReceiptPayments(null)}>
              Fermer
            </Button>
            <Button onClick={handlePrintReceipt} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print-only copy: rendered directly on <body>, outside the Dialog, so it
          has no transformed ancestor to fight with position:fixed at print time */}
      {receiptPayments &&
        typeof document !== "undefined" &&
        createPortal(
          <div id="payment-receipt" className="hidden print:block">
            <ReceiptCopy payments={receiptPayments} label="Exemplaire Client" />
            <div className="my-2 flex items-center gap-2 text-muted-foreground">
              <div className="flex-1 border-t border-dashed border-foreground/40" />
              <Scissors className="h-3 w-3 shrink-0" />
              <div className="flex-1 border-t border-dashed border-foreground/40" />
            </div>
            <ReceiptCopy payments={receiptPayments} label="Exemplaire École" />
          </div>,
          document.body
        )}

      {/* Statistics */}
      {canSeeStats && (
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-1.5">
              Total Collecté
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 opacity-80 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Somme des montants déjà payés</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{formatAriary(totalCollected)}</div>
              <Wallet className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-100 flex items-center gap-1.5">
              En Attente
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 opacity-80 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Différence entre le montant attendu et le montant payé</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{formatAriary(totalPending)}</div>
              <Clock className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-1.5">
              Total Attendu
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 opacity-80 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Somme des montants dus sur tous les paiements enregistrés</TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{formatAriary(totalExpected)}</div>
              <Wallet className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-1.5">
              Historique des Paiements ({historyTotal})
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Affiche 10 paiements à la fois, triés du plus récent au plus ancien
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un élève..."
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
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    N° Reçu
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Les lignes partageant le même numéro appartiennent au même reçu
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>Élève</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Montant Dû</TableHead>
                <TableHead>Montant Payé</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Enregistré par</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyItems.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-muted-foreground">
                    {payment.receiptNumber.padStart(6, "0")}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.studentName}
                    <div className="text-xs text-muted-foreground">
                      {payment.studentMatricule}
                    </div>
                  </TableCell>
                  <TableCell>{payment.paymentTypeName}</TableCell>
                  <TableCell className="capitalize">
                    {payment.month} {payment.year}
                  </TableCell>
                  <TableCell>{formatAriary(payment.amountDue)}</TableCell>
                  <TableCell className="text-green-600 font-medium">
                    {formatAriary(payment.amountPaid)}
                  </TableCell>
                  <TableCell>{getStatus(payment)}</TableCell>
                  <TableCell>
                    {new Date(payment.paymentDate).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.recordedByName ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canSeeStats && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReprint(payment)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Réimprimer le reçu</TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(payment.id)}
                            disabled={!canSeeStats}
                          >
                            <Trash2
                              className={`h-4 w-4 ${
                                canSeeStats ? "text-destructive" : "text-muted-foreground"
                              }`}
                            />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {canSeeStats
                            ? "Supprimer ce paiement"
                            : "Seul un administrateur peut supprimer un paiement"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isHistoryLoading && historyItems.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun paiement trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Page {historyPage} sur {historyTotalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1 || isHistoryLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                  disabled={historyPage >= historyTotalPages || isHistoryLoading}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
