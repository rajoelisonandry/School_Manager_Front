"use client";

import { useState } from "react";
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
import { Plus, Pencil, Trash2, Search, X } from "lucide-react";
import studentsData from "@/lib/data/students.json";
import classesData from "@/lib/data/classes.json";

interface Student {
  id: string;
  matricule: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  classId: string;
  gender: string;
  address: string;
  phones: string[];
  fatherName: string;
  fatherProfession: string;
  motherName: string;
  motherProfession: string;
  enrollmentDate: string;
  status: string;
}

const emptyFormData: Partial<Student> = {
  matricule: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  placeOfBirth: "",
  classId: "",
  gender: "M",
  address: "",
  phones: [""],
  fatherName: "",
  fatherProfession: "",
  motherName: "",
  motherProfession: "",
  enrollmentDate: new Date().toISOString().split("T")[0],
  status: "active",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(studentsData.students);
  const [classes] = useState(classesData.classes);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>(emptyFormData);

  const filteredStudents = students.filter(
    (student) =>
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.matricule.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedPhones = (formData.phones ?? []).filter(
      (phone) => phone.trim() !== ""
    );
    const dataToSave = { ...formData, phones: cleanedPhones };

    if (editingStudent) {
      // Update existing student
      setStudents((prev) =>
        prev.map((s) =>
          s.id === editingStudent.id ? { ...s, ...dataToSave } : s
        )
      );
    } else {
      // Create new student
      const newStudent: Student = {
        id: Date.now().toString(),
        ...dataToSave,
      } as Student;
      setStudents((prev) => [...prev, newStudent]);
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData(student);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet élève ?")) {
      setStudents((prev) => prev.filter((s) => s.id !== id));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Élèves</h1>
          <p className="text-muted-foreground mt-2">
            Gérer les informations des élèves
          </p>
        </div>
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
                    <label className="text-sm font-medium">Matricule</label>
                    <Input
                      name="matricule"
                      value={formData.matricule}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Classe</label>
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
                    <label className="text-sm font-medium">Date de Naissance</label>
                    <Input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lieu de Naissance</label>
                    <Input
                      name="placeOfBirth"
                      value={formData.placeOfBirth}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
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
                  <label className="text-sm font-medium">Adresse</label>
                  <Input
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Téléphone(s)</label>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date d'Inscription</label>
                  <Input
                    type="date"
                    name="enrollmentDate"
                    value={formData.enrollmentDate}
                    onChange={handleInputChange}
                    required
                  />
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
                  {editingStudent ? "Modifier" : "Créer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des Élèves ({filteredStudents.length})</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher par nom ou matricule..."
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
                <TableHead>Matricule</TableHead>
                <TableHead>Nom Complet</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Naissance</TableHead>
                <TableHead>Téléphone(s)</TableHead>
                <TableHead>Père</TableHead>
                <TableHead>Mère</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.matricule}</TableCell>
                  <TableCell className="font-medium">
                    {student.firstName} {student.lastName}
                  </TableCell>
                  <TableCell>{getClassName(student.classId)}</TableCell>
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
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {student.status === "active" ? "Actif" : "Inactif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(student)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(student.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    Aucun élève trouvé
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
