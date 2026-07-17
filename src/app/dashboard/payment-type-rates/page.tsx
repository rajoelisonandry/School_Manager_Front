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
import { Plus, Pencil, Trash2, Tag, Info } from "lucide-react";
import {
  getPaymentTypeRates,
  createPaymentTypeRate,
  updatePaymentTypeRate,
  deletePaymentTypeRate,
} from "./actions";
import { getPaymentTypes } from "../payment-types/actions";
import { getClasses } from "../classes/actions";
import { currentSchoolYear, schoolYearOptions, schoolYearStart } from "@/lib/school-year";

interface PaymentTypeRate {
  id: string;
  paymentTypeId: string;
  paymentTypeName: string;
  classId: string;
  className: string;
  year: number;
  amount: number;
}

interface PaymentTypeOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
}

const emptyFormData = {
  paymentTypeId: "",
  classId: "",
  schoolYear: currentSchoolYear(),
  year: schoolYearStart(currentSchoolYear()),
  amount: 0,
};

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

export default function PaymentTypeRatesPage() {
  const [rates, setRates] = useState<PaymentTypeRate[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentTypeOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<PaymentTypeRate | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [ratesData, typesData, classesData] = await Promise.all([
      getPaymentTypeRates(),
      getPaymentTypes(),
      getClasses(),
    ]);
    setRates(ratesData);
    setPaymentTypes(typesData);
    setClasses(classesData);
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { schoolYear, ...payload } = formData;
    void schoolYear;

    if (editingRate) {
      await updatePaymentTypeRate(editingRate.id, payload);
    } else {
      await createPaymentTypeRate(payload);
    }

    resetForm();
    setIsDialogOpen(false);
    loadData();
  };

  const handleSchoolYearChange = (schoolYear: string) => {
    setFormData((prev) => ({ ...prev, schoolYear, year: schoolYearStart(schoolYear) }));
  };

  const handleEdit = (rate: PaymentTypeRate) => {
    setEditingRate(rate);
    setFormData({
      paymentTypeId: rate.paymentTypeId,
      classId: rate.classId,
      schoolYear: `${rate.year}-${rate.year + 1}`,
      year: rate.year,
      amount: rate.amount,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce tarif ?")) {
      await deletePaymentTypeRate(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingRate(null);
    setFormData(emptyFormData);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            Tarifs par Classe
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-64">
                Un tarif défini ici remplace le montant par défaut du type de paiement,
                pour une classe et une année précises
              </TooltipContent>
            </Tooltip>
          </h1>
          <p className="text-muted-foreground mt-2">
            Montant de chaque type de paiement (Écolage, etc.) par classe et par année
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Tarif
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRate ? "Modifier le Tarif" : "Nouveau Tarif"}
              </DialogTitle>
              <DialogDescription>
                Définir le montant d&apos;un type de paiement pour une classe et une année
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type de Paiement</label>
                  <Select
                    value={formData.paymentTypeId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, paymentTypeId: value }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un type" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Classe</label>
                  <Select
                    value={formData.classId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, classId: value }))
                    }
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Année scolaire</label>
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Montant (Ariary)</label>
                    <Input
                      type="number"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, amount: Number(e.target.value) }))
                      }
                      min="0"
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingRate ? "Modifier" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Tarifs ({rates.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Année scolaire</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((rate) => (
                <TableRow key={rate.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      {rate.paymentTypeName}
                    </div>
                  </TableCell>
                  <TableCell>{rate.className}</TableCell>
                  <TableCell>{rate.year}-{rate.year + 1}</TableCell>
                  <TableCell>{formatAriary(rate.amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(rate)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Modifier ce tarif</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(rate.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Supprimer ce tarif</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun tarif défini. Le montant par défaut du type de paiement sera utilisé.
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
