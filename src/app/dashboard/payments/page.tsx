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
import { Search, Wallet, CheckCircle, Clock, Plus, Trash2, Info } from "lucide-react";
import { getPayments, createPayment, deletePayment } from "./actions";
import { getStudents } from "../students/actions";
import { getPaymentTypes } from "../payment-types/actions";
import { getClasses } from "../classes/actions";
import { getPaymentTypeRates } from "../payment-type-rates/actions";

interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  studentMatricule: string;
  paymentTypeId: string;
  paymentTypeName: string;
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
  year: new Date().getFullYear(),
  amountDue: 0,
  amountPaid: 0,
  paymentDate: new Date().toISOString().split("T")[0],
};

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
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

  // Le tarif spécifique (classe + année) prime sur le montant par défaut du type de paiement
  const resolveAmount = (classId: string, paymentTypeId: string, year: number) => {
    const rate = rates.find(
      (r) =>
        r.classId === classId && r.paymentTypeId === paymentTypeId && r.year === year
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
        ? resolveAmount(classId, prev.paymentTypeId, prev.year)
        : prev.amountDue;
      return { ...prev, classId, studentId: "", amountDue: amount, amountPaid: amount };
    });
  };

  const handlePaymentTypeChange = (paymentTypeId: string) => {
    setFormData((prev) => {
      const amount = resolveAmount(prev.classId, paymentTypeId, prev.year);
      return { ...prev, paymentTypeId, amountDue: amount, amountPaid: amount };
    });
  };

  const handleYearChange = (year: number) => {
    setFormData((prev) => {
      const amount = prev.paymentTypeId
        ? resolveAmount(prev.classId, prev.paymentTypeId, year)
        : prev.amountDue;
      return { ...prev, year, amountDue: amount, amountPaid: amount };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { classId, ...paymentData } = formData;
    void classId;
    await createPayment(paymentData);

    resetForm();
    setIsDialogOpen(false);
    loadData();
  };

  const handleDelete = async (id: string) => {
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
                      {paymentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} - {formatAriary(type.amount)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Période (ex: Septembre)</label>
                    <Input
                      value={formData.month}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, month: e.target.value }))
                      }
                      placeholder="Mois ou période"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Année</label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => handleYearChange(Number(e.target.value))}
                      required
                    />
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
                            r.year === formData.year
                        )
                          ? "Tarif spécifique à cette classe/année"
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
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(payment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Supprimer ce paiement</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPayments.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
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
