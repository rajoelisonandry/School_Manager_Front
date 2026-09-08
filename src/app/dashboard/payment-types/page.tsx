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
import { Plus, Pencil, Trash2, Wallet, AlertTriangle, Info } from "lucide-react";
import {
  getPaymentTypes,
  createPaymentType,
  updatePaymentType,
  deletePaymentType,
} from "./actions";
import { getClasses } from "../classes/actions";
import { getPaymentTypeRates } from "../payment-type-rates/actions";
import { currentSchoolYear, schoolYearStart } from "@/lib/school-year";
import { PageHeader } from "@/components/page-header";
import { PageListSkeleton } from "@/components/loading-skeletons";
import { getCachedData, setCachedData } from "@/lib/page-data-cache";

interface PaymentType {
  id: string;
  name: string;
  amount: number;
  classId: string | null;
  className: string | null;
}

interface ClassOption {
  id: string;
  name: string;
}

interface RateOption {
  paymentTypeId: string;
  year: number;
  amount: number;
}

const CURRENT_YEAR = schoolYearStart(currentSchoolYear());

const ALL_CLASSES = "all";

const emptyFormData = {
  name: "",
  amount: 0,
  classId: ALL_CLASSES,
};

function formatAriary(amount: number) {
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

interface PaymentTypesPageCache {
  paymentTypes: PaymentType[];
  classes: ClassOption[];
  rates: RateOption[];
}
// Voir @/lib/page-data-cache : affiche instantanément les données de la
// dernière visite pendant qu'un rafraîchissement silencieux se termine.
const CACHE_KEY = "payment-types-page";

export default function PaymentTypesPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "admin";
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>(
    () => getCachedData<PaymentTypesPageCache>(CACHE_KEY)?.paymentTypes ?? []
  );
  const [classes, setClasses] = useState<ClassOption[]>(
    () => getCachedData<PaymentTypesPageCache>(CACHE_KEY)?.classes ?? []
  );
  const [rates, setRates] = useState<RateOption[]>(
    () => getCachedData<PaymentTypesPageCache>(CACHE_KEY)?.rates ?? []
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PaymentType | null>(null);
  const [formData, setFormData] = useState(emptyFormData);
  const [isLoading, setIsLoading] = useState(
    () => getCachedData<PaymentTypesPageCache>(CACHE_KEY) === undefined
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (getCachedData<PaymentTypesPageCache>(CACHE_KEY) === undefined) setIsLoading(true);
    const [types, classesData, ratesData] = await Promise.all([
      getPaymentTypes(),
      getClasses(),
      getPaymentTypeRates(),
    ]);
    setCachedData<PaymentTypesPageCache>(CACHE_KEY, {
      paymentTypes: types,
      classes: classesData,
      rates: ratesData,
    });
    setPaymentTypes(types);
    setClasses(classesData);
    setRates(ratesData);
    setIsLoading(false);
  };

  // Pour l'année en cours, vérifie si les tarifs par classe divergent du montant
  // par défaut du type de paiement. S'ils sont tous égaux, pas d'incohérence à signaler.
  const getAmountInfo = (type: PaymentType) => {
    const ratesForYear = rates.filter(
      (r) => r.paymentTypeId === type.id && r.year === CURRENT_YEAR
    );
    if (ratesForYear.length === 0) {
      return { variable: false as const, amount: type.amount };
    }
    const amounts = new Set([type.amount, ...ratesForYear.map((r) => r.amount)]);
    if (amounts.size === 1) {
      return { variable: false as const, amount: type.amount };
    }
    const values = ratesForYear.map((r) => r.amount);
    return {
      variable: true as const,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingType && !isAdmin) return;

    const payload = {
      name: formData.name,
      amount: formData.amount,
      classId: formData.classId === ALL_CLASSES ? null : formData.classId,
    };

    if (editingType) {
      await updatePaymentType(editingType.id, payload);
    } else {
      await createPaymentType(payload);
    }

    resetForm();
    setIsDialogOpen(false);
    loadData();
  };

  const handleEdit = (type: PaymentType) => {
    if (!isAdmin) return;

    setEditingType(type);
    setFormData({
      name: type.name,
      amount: type.amount,
      classId: type.classId ?? ALL_CLASSES,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;

    if (confirm("Êtes-vous sûr de vouloir supprimer ce type de paiement ?")) {
      await deletePaymentType(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingType(null);
    setFormData(emptyFormData);
  };

  if (isLoading) {
    return (
      <PageListSkeleton tableCols={4} tableRows={5} tableHeaderControls={0} withHeaderActionButton />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader
          icon={Wallet}
          title="Types de Paiement"
          subtitle="Écolage, frais généraux, excursions, et autres frais scolaires"
        />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? "Modifier le Type de Paiement" : "Nouveau Type de Paiement"}
              </DialogTitle>
              <DialogDescription>
                {editingType
                  ? "Modifier les informations de ce type de paiement"
                  : "Ajouter un nouveau type de paiement (ex: Écolage, Excursion...)"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Nom<span className="text-destructive">*</span>
                  </label>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Écolage, Frais généraux, Excursion..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Montant (Ariary)<span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="number"
                    name="amount"
                    value={formData.amount}
                    onChange={handleInputChange}
                    min="0"
                    step="1"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    Classe concernée
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">
                        Laissez sur &quot;Toutes les classes&quot; si ce type de paiement
                        s&apos;applique partout avec le même montant par défaut
                      </TooltipContent>
                    </Tooltip>
                  </label>
                  <Select
                    value={formData.classId}
                    onValueChange={(value) =>
                      setFormData((prev) => ({ ...prev, classId: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                <span className="text-destructive">*</span> Champs obligatoires
              </p>
              <DialogFooter className="mt-2">
                <Button type="submit" disabled={Boolean(editingType) && !isAdmin}>
                  {editingType ? "Modifier" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Types de Paiement ({paymentTypes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1.5">
                    Montant
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-56">
                        Montant par défaut. S&apos;il varie selon la classe, un tarif
                        spécifique est utilisé (voir Tarifs par Classe)
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TableHead>
                <TableHead>Classe concernée</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentTypes.map((type) => {
                const amountInfo = getAmountInfo(type);
                return (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      {type.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {amountInfo.variable ? (
                      <div className="flex items-center gap-1.5 text-amber-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <div>
                          <div className="text-sm font-medium">
                            Variable selon la classe
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatAriary(amountInfo.min)} - {formatAriary(amountInfo.max)}
                            {" · voir "}
                            <a
                              href="/dashboard/payment-type-rates"
                              className="underline"
                            >
                              Tarifs par Classe
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      formatAriary(amountInfo.amount)
                    )}
                  </TableCell>
                  <TableCell>{type.className ?? "Toutes les classes"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(type)}
                            disabled={!isAdmin}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isAdmin
                            ? "Modifier ce type de paiement"
                            : "Seul un administrateur peut modifier un type de paiement"}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(type.id)}
                            disabled={!isAdmin}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isAdmin
                            ? "Supprimer ce type de paiement"
                            : "Seul un administrateur peut supprimer un type de paiement"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
              {paymentTypes.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun type de paiement défini
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
