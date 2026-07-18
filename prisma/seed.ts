import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  // Seed Users
  const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/lib/data/users.json'), 'utf-8'))
  for (const user of usersData.users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: {
        id: user.id,
        username: user.username,
        password: user.password,
        role: user.role,
        name: user.name,
        email: user.email,
        createdAt: new Date(user.createdAt)
      }
    })
  }

  // Seed Classes
  const classesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/data/classes.json'), 'utf-8'))
  for (const cls of classesData.classes) {
    await prisma.class.upsert({
      where: { id: cls.id },
      update: {},
      create: {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        capacity: cls.capacity,
        currentStudents: cls.currentStudents
      }
    })
  }

  // Seed Students
  const studentsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/data/students.json'), 'utf-8'))
  for (const student of studentsData.students) {
    await prisma.student.upsert({
      where: { id: student.id },
      update: {},
      create: {
        id: student.id,
        matricule: student.matricule,
        firstName: student.firstName,
        lastName: student.lastName,
        dateOfBirth: new Date(student.dateOfBirth),
        placeOfBirth: student.placeOfBirth,
        gender: student.gender,
        address: student.address,
        phones: student.phones,
        fatherName: student.fatherName,
        fatherProfession: student.fatherProfession,
        motherName: student.motherName,
        motherProfession: student.motherProfession,
        enrollmentDate: new Date(student.enrollmentDate),
        status: student.status,
        classId: student.classId
      }
    })
  }

  // Seed Teachers
  const teachersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/data/teachers.json'), 'utf-8'))
  for (const teacher of teachersData.teachers) {
    const createdTeacher = await prisma.teacher.upsert({
      where: { id: teacher.id },
      update: {},
      create: {
        id: teacher.id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        phone: teacher.phone,
        specialty: teacher.specialty,
        hourlyRate: teacher.hourlyRate,
        hireDate: new Date(teacher.hireDate),
        status: teacher.status
      }
    })

    // Link teachers to classes
    for (const classId of teacher.classesTaught) {
      await prisma.teacherClass.upsert({
        where: {
          teacherId_classId: {
            teacherId: teacher.id,
            classId: classId
          }
        },
        update: {},
        create: {
          teacherId: teacher.id,
          classId: classId
        }
      })
    }
  }

  // Seed Tuitions
  const tuitionData = JSON.parse(fs.readFileSync(path.join(__dirname, '../lib/data/tuition.json'), 'utf-8'))
  for (const tuition of tuitionData.tuitions) {
    const createdTuition = await prisma.tuition.upsert({
      where: { id: tuition.id },
      update: {},
      create: {
        id: tuition.id,
        studentId: tuition.studentId,
        schoolYear: tuition.schoolYear,
        totalAmount: tuition.totalAmount,
        totalPaid: tuition.totalPaid
      }
    })

    // Seed Payments
    for (const payment of tuition.monthlyPayments) {
      await prisma.payment.create({
        data: {
          tuitionId: tuition.id,
          month: payment.month,
          amount: payment.amount,
          status: payment.status,
          paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : null
        }
      })
    }
  }

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
