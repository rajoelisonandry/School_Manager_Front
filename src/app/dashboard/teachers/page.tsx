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
import { Plus, Pencil, Trash2, Search, BookOpen, Euro } from "lucide-react";
import { getTeachers, getClasses, createTeacher, updateTeacher, deleteTeacher } from './actions'

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialty: string;
  hourlyRate: number;
  classes?: Array<{
    class: {
      id: string;
      name: string;
    };
  }>;
  hireDate: Date;
  status: string;
}

interface Class {
  id: string;
  name: string;
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Teacher>>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialty: "",
    hourlyRate: 30,
    hireDate: new Date(),
    status: "active",
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [teachersData, classesData] = await Promise.all([
      getTeachers(),
      getClasses()
    ]);
    setTeachers(teachersData);
    setClasses(classesData);
    setIsLoading(false);
  };

  const filteredTeachers = teachers.filter(
    (teacher) =>
      teacher.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacher.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "hourlyRate" ? parseFloat(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const teacherData = {
      ...formData,
      classesTaught: selectedClasses,
    };

    if (editingTeacher) {
      setTeachers((prev) =>
        prev.map((t) =>
          t.id === editingTeacher.id ? { ...t, ...teacherData } : t
        )
      );
 setSelectedClasses([]);
    } else {
      const newTeacher: Teacher = {
        id: Date.now().toString(),
        ...teacherData,
      } as Teacher;
      setTeachers((prev) => [...prev, newTeacher]);
      setSelectedClasses([]);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData(teacher);
    setSelectedClasses(teacher.classes?.map(c => c.class.id) || []);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce professeur ?")) {
      await deleteTeacher(id);
      loadData();
    }
  };

  const resetForm = () => {
    setEditingTeacher(null);
    setSelectedClasses([]);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      specialty: "",
      hourlyRate: 30,
      hireDate: new Date(),
      status: "active",
    });
  };

  const getClassNames = (teacher: Teacher) => {
    return teacher.classes?.map(c => c.class.name).join(", ") || "";
  };

  const getClassesTaughtCount = (teacher: Teacher) => {
    return teacher.classes?.length || 0;
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestion des Professeurs
          </h1>
          <p className="text-muted-foreground mt-2">
            Gérer le personnel enseignant
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Nouveau Professeur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTeacher ? "Modifier le Professeur" : "Nouveau Professeur"}
              </DialogTitle>
              <DialogDescription>
                {editingTeacher
                  ? "Modifier les informations du professeur"
                  : "Ajouter un nouveau professeur au syst ème"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prénom</label>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nom</label>
                    <Input
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Téléphone</label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Spécialité</label>
                  <Input
                    name="specialty"
                    value={formData.specialty}
                    onChange={handleInputChange}
                    placeholder="Ex: Mathématiques, Français, etc."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tarif Horaire (MGA)</label>
                    <Input
                      type="number"
                      name="hourlyRate"
                      value={formData.hourlyRate}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date d'Embauche</label>
                    <Input
                      type="date"
                      name="hireDate"
                      value={formData.hireDate instanceof Date ? formData.hireDate.toISOString().split('T')[0] : ''}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Classes Enseignées</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                    {classes.map((cls) => (
                      <label
                        key={cls.id}
                        className="flex items-center space-x-2 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cls.id)}
                          onChange={() => handleClassToggle(cls.id)}
                          className="rounded"
                        />
                        <span>{cls.name}</span>
                      </label>
                    ))}
                  </div>
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
              <DialogFooter>
                <Button type="submit">
                  {editingTeacher ? "Modifier" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des Professeurs ({filteredTeachers.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher un professeur..."
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
                <TableHead>Nom Complet</TableHead>
                <TableHead>Spécialité</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Tarif Horaire</TableHead>
                <TableHead>Classes</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => (
                <TableRow key={teacher.id}>
                  <TableCell className="font-medium">
                    {teacher.firstName} {teacher.lastName}
                  </TableCell>
                  <TableCell>{teacher.specialty}</TableCell>
                  <TableCell>{teacher.email}</TableCell>
                  <TableCell>{teacher.phone}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {teacher.hourlyRate.toFixed(2)} &nbsp; MGA
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-sm">
                        {getClassesTaughtCount(teacher)} classe(s)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getClassNames(teacher)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        teacher.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {teacher.status === "active" ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(teacher)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(teacher.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTeachers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun professeur trouvé
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
