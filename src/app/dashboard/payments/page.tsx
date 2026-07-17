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
import { Search, Wallet, CheckCircle, Clock, Plus, Trash2, Info, Printer, Receipt, Scissors } from "lucide-react";
import { getPayments, createPayment, deletePayment } from "./actions";
import { getStudents } from "../students/actions";
import { getPaymentTypes } from "../payment-types/actions";
import { getClasses } from "../classes/actions";
import { getPaymentTypeRates } from "../payment-type-rates/actions";
import { currentSchoolYear, schoolYearOptions, schoolYearStart, yearForMonth } from "@/lib/school-year";

interface Payment {
  id: string;
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

const emptyFormData = {
  classId: "",
  studentId: "",
  paymentTypeId: "",
  month: "",
  schoolYear: currentSchoolYear(),
  year: yearForMonth(currentSchoolYear(), ""),
  amountDue: 0,
  amountPaid: 0,
  paymentDate: new Date().toISOString().split("T")[0],
};

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

function ReceiptCopy({ payment, label }: { payment: Payment; label: string }) {
  return (
    <div className="font-mono text-xs text-foreground">
      <div className="text-center">
        <p className="text-sm font-bold uppercase">Au Bel Enfant</p>
        <p className="italic text-muted-foreground">Ambition - Motivation - Réussite</p>
      </div>
      <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wide">
        {label}
      </p>
      <div className="my-2 border-t border-dashed border-foreground/30" />
      <p className="text-center font-semibold">REÇU DE PAIEMENT</p>
      <p className="text-center text-muted-foreground">
        N° {payment.id.padStart(6, "0")}
      </p>
      <div className="my-2 border-t border-dashed border-foreground/30" />

      <div className="space-y-1">
        <div className="flex justify-between gap-2">
          <span>Élève</span>
          <span className="text-right">{payment.studentName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Matricule</span>
          <span>{payment.studentMatricule}</span>
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-foreground/30" />

      <div className="space-y-1">
        <div className="flex justify-between gap-2">
          <span>Type</span>
          <span className="text-right">{payment.paymentTypeName}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Période</span>
          <span className="capitalize">
            {payment.month} {payment.year}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>Date</span>
          <span>{new Date(payment.paymentDate).toLocaleDateString("fr-FR")}</span>
        </div>
      </div>

      <div className="my-2 border-t border-dashed border-foreground/30" />

      <div className="space-y-1">
        <div className="flex justify-between gap-2">
          <span>Montant Dû</span>
          <span>{formatAriary(payment.amountDue)}</span>
        </div>
        <div className="flex justify-between gap-2 font-bold">
          <span>Montant Payé</span>
          <span>{formatAriary(payment.amountPaid)}</span>
        </div>
        {payment.amountDue > payment.amountPaid && (
          <div className="flex justify-between gap-2">
            <span>Reste</span>
            <span>{formatAriary(payment.amountDue - payment.amountPaid)}</span>
          </div>
        )}
      </div>

      <div className="my-2 border-t border-dashed border-foreground/30" />

      <p className="text-center text-[10px] text-muted-foreground">
        Enregistré par {payment.recordedByName ?? "-"}
      </p>

      <div className="my-2 border-t border-dashed border-foreground/30" />

      <p className="text-center font-semibold">Merci de votre confiance !</p>
    </div>
  );
}

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
  const [formData, setFormData] = useState(emptyFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  useEffect(() => {
    loadData();
  }, []);

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

  const filteredPayments = payments.filter(
    (p) =>
      p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.studentMatricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const studentsForForm = formData.classId
    ? students.filter((s) => s.classId === formData.classId)
    : students;

  const handleClassChange = (classId: string) => {
    setFormData((prev) => {
      const amount = prev.paymentTypeId
        ? resolveAmount(classId, prev.paymentTypeId, schoolYearStart(prev.schoolYear))
        : prev.amountDue;
      return { ...prev, classId, studentId: "", amountDue: amount, amountPaid: amount };
    });
  };

  const handlePaymentTypeChange = (paymentTypeId: string) => {
    setFormData((prev) => {
      const amount = resolveAmount(prev.classId, paymentTypeId, schoolYearStart(prev.schoolYear));
      return { ...prev, paymentTypeId, amountDue: amount, amountPaid: amount };
    });
  };

  const handleMonthChange = (month: string) => {
    setFormData((prev) => {
      const year = yearForMonth(prev.schoolYear, month);
      const amount = prev.paymentTypeId
        ? resolveAmount(prev.classId, prev.paymentTypeId, schoolYearStart(prev.schoolYear))
        : prev.amountDue;
      return { ...prev, month, year, amountDue: amount, amountPaid: amount };
    });
  };

  const handleSchoolYearChange = (schoolYear: string) => {
    setFormData((prev) => {
      const year = yearForMonth(schoolYear, prev.month);
      const amount = prev.paymentTypeId
        ? resolveAmount(prev.classId, prev.paymentTypeId, schoolYearStart(schoolYear))
        : prev.amountDue;
      return { ...prev, schoolYear, year, amountDue: amount, amountPaid: amount };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { classId, schoolYear, ...paymentData } = formData;
    void classId;
    void schoolYear;
    const created = await createPayment({ ...paymentData, recordedByUserId: currentUser?.id });

    resetForm();
    setIsDialogOpen(false);
    loadData();
    setReceiptPayment(created);
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
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Paiements des Élèves</h1>
          <p className="text-muted-foreground mt-2">
            Écolage, frais généraux, excursions et autres paiements (en Ariary)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Paiement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer un Paiement</DialogTitle>
              <DialogDescription>
                Enregistrer un paiement pour un élève
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
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
                  <label className="text-sm font-medium">Élève</label>
                  <Select
                    value={formData.studentId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, studentId: value }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un élève" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentsForForm.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.matricule} - {student.firstName} {student.lastName}
                        </SelectItem>
                      ))}
                      {studentsForForm.length === 0 && (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          Aucun élève dans cette classe
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type de Paiement</label>
                  <Select
                    value={formData.paymentTypeId}
                    onValueChange={handlePaymentTypeChange}
                    required
                  >
                    <SelectTrigger>
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Période (ex: Septembre)</label>
                    <Input
                      value={formData.month}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      placeholder="Mois ou période"
                      required
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1.5">
                      Montant Dû (Ariary)
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-56">
                          Rempli automatiquement selon la classe et le type de paiement
                          choisis, modifiable si nécessaire
                        </TooltipContent>
                      </Tooltip>
                    </label>
                    <Input
                      type="number"
                      value={formData.amountDue}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amountDue: Number(e.target.value),
                        }))
                      }
                      min="0"
                      required
                    />
                    {formData.classId && formData.paymentTypeId && (
                      <p className="text-xs text-muted-foreground">
                        {rates.some(
                          (r) =>
                            r.classId === formData.classId &&
                            r.paymentTypeId === formData.paymentTypeId &&
                            r.year === schoolYearStart(formData.schoolYear)
                        )
                          ? "Tarif spécifique à cette classe/année scolaire"
                          : "Montant par défaut du type de paiement"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Montant Payé (Ariary)</label>
                    <Input
                      type="number"
                      value={formData.amountPaid}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amountPaid: Number(e.target.value),
                        }))
                      }
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date de Paiement</label>
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
              <DialogFooter>
                <Button type="submit">Enregistrer</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Receipt preview */}
      <Dialog open={!!receiptPayment} onOpenChange={(open) => !open && setReceiptPayment(null)}>
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

          {receiptPayment && (
            <div
              id="payment-receipt"
              className="mx-auto max-h-[65vh] w-full max-w-[280px] overflow-y-auto rounded-md border border-dashed border-foreground/30 bg-card p-4"
            >
              <ReceiptCopy payment={receiptPayment} label="Exemplaire Client" />

              <div className="my-4 flex items-center gap-2 text-muted-foreground">
                <div className="flex-1 border-t border-dashed border-foreground/40" />
                <Scissors className="h-3 w-3 shrink-0" />
                <div className="flex-1 border-t border-dashed border-foreground/40" />
              </div>

              <ReceiptCopy payment={receiptPayment} label="Exemplaire École" />
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setReceiptPayment(null)}>
              Fermer
            </Button>
            <Button onClick={handlePrintReceipt} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <CardTitle>Historique des Paiements ({filteredPayments.length})</CardTitle>
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
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
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
                              onClick={() => setReceiptPayment(payment)}
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
              {filteredPayments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun paiement trouvé
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
