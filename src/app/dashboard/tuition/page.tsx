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
import { Search, DollarSign, CheckCircle, Clock, Calendar } from "lucide-react";
import { getTuitions, updatePayment } from './actions'

interface MonthlyPayment {
  id: string;
  month: string;
  amount: number;
  status: string;
  paymentDate: Date | null;
}

interface Tuition {
  id: string;
  studentId: string;
  schoolYear: string;
  payments: MonthlyPayment[];
  totalAmount: number;
  totalPaid: number;
  student: {
    firstName: string;
    lastName: string;
  };
}

const MONTHS = [
  "septembre",
  "octobre",
  "novembre",
  "décembre",
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
];

export default function TuitionPage() {
  const [tuitions, setTuitions] = useState<Tuition[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTuition, setSelectedTuition] = useState<Tuition | null>(null);
  const [paymentMonth, setPaymentMonth] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTuitions();
  }, []);

  const loadTuitions = async () => {
    setIsLoading(true);
    const data = await getTuitions();
    setTuitions(data);
    setIsLoading(false);
  };

  const filteredTuitions = tuitions.filter((tuition) => {
    return (
      tuition.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tuition.student.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handlePayment = async () => {
    if (!selectedTuition || !paymentMonth) return;

    const payment = selectedTuition.payments.find(p => p.month === paymentMonth);
    if (payment) {
      await updatePayment(payment.id, {
        status: 'paid',
        paymentDate: new Date()
      });
    }

    setIsDialogOpen(false);
    setSelectedTuition(null);
    setPaymentMonth("");
    setPaymentAmount(0);
    loadTuitions();
  };

  const getStudentName = (tuition: Tuition) => {
    return `${tuition.student.firstName} ${tuition.student.lastName}`;
  };

  const getPaymentStatus = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Payé
          </span>
        );
      case "pending":
        return (
          <span className="flex items-center gap-1 text-amber-600">
            <Clock className="h-4 w-4" />
            En attente
          </span>
        );
      default:
        return status;
    }
  };

  const totalCollected = tuitions.reduce((sum, t) => sum + t.totalPaid, 0);
  const totalPending = tuitions.reduce(
    (sum, t) => sum + (t.totalAmount - t.totalPaid),
    0
  );
  const totalExpected = tuitions.reduce((sum, t) => sum + t.totalAmount, 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestion de l'Écolage</h1>
        <p className="text-muted-foreground mt-2">
          Suivi des paiements mensuels (Septembre - Juillet)
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-100">
              Total Collecté
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalCollected.toLocaleString()}MGA</div>
              <DollarSign className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-100">
              En Attente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalPending.toLocaleString()}MGA</div>
              <Clock className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-100">
              Total Attendu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalExpected.toLocaleString()}MGA</div>
              <Calendar className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tuitions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Écolage par Élève ({filteredTuitions.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un élève..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Élève</TableHead>
                <TableHead>Année Scolaire</TableHead>
                <TableHead>Total Attendu</TableHead>
                <TableHead>Total Payé</TableHead>
                <TableHead>Reste</TableHead>
                <TableHead>Progression</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTuitions.map((tuition) => {
                const remaining = tuition.totalAmount - tuition.totalPaid;
                const progress = (tuition.totalPaid / tuition.totalAmount) * 100;
                return (
                  <TableRow key={tuition.id}>
                    <TableCell className="font-medium">
                      {getStudentName(tuition)}
                    </TableCell>
                    <TableCell>{tuition.schoolYear}</TableCell>
                    <TableCell>{tuition.totalAmount.toLocaleString()}MGA</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {tuition.totalPaid.toLocaleString()} &nbsp; MGA
                    </TableCell>
                    <TableCell className="text-amber-600 font-medium">
                      {remaining.toLocaleString()} &nbsp; MGA
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              progress === 100
                                ? "bg-green-500"
                                : progress > 50
                                ? "bg-blue-500"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-sm">{progress.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog
                        open={isDialogOpen && selectedTuition?.id === tuition.id}
                        onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (open) setSelectedTuition(tuition);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <DollarSign className="h-4 w-4 mr-2" />
                            Payer
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Enregistrer un Paiement</DialogTitle>
                            <DialogDescription>
                              {getStudentName(tuition)} - {tuition.schoolYear}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Mois</label>
                              <Select
                                value={paymentMonth}
                                onValueChange={setPaymentMonth}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un mois" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tuition.payments
                                    .filter((p: any) => p.status === "pending")
                                    .map((payment: any) => (
                                      <SelectItem
                                        key={payment.month}
                                        value={payment.month}
                                      >
                                        {payment.month.charAt(0).toUpperCase() +
                                          payment.month.slice(1)}{" "}
                                        - {payment.amount} &nbsp; MGA
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {paymentMonth && (
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Montant</label>
                                <Input
                                  type="number"
                                  value={paymentAmount}
                                  onChange={(e) =>
                                    setPaymentAmount(parseFloat(e.target.value))
                                  }
                                  disabled
                                />
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button onClick={handlePayment} disabled={!paymentMonth}>
                              Confirmer le Paiement
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredTuitions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun écolage trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly Details */}
      {selectedTuition && (
        <Card>
          <CardHeader>
            <CardTitle>Détails des Paiements - {getStudentName(selectedTuition)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mois</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date de Paiement</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedTuition.payments.map((payment: any) => (
                  <TableRow key={payment.month}>
                    <TableCell className="font-medium capitalize">
                      {payment.month}
                    </TableCell>
                    <TableCell>{payment.amount}MGA</TableCell>
                    <TableCell>{getPaymentStatus(payment.status)}</TableCell>
                    <TableCell>
                      {payment.paymentDate
                        ? new Date(payment.paymentDate).toLocaleDateString("fr-FR")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
