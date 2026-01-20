import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { Course, CourseDocument } from './schemas/course.schema';
import { Progress, ProgressDocument } from './schemas/progress.schema';
import { Student, StudentDocument } from './schemas/student.schema';

@Injectable()
export class StudentService {
  constructor(
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    @InjectModel(Progress.name) private progressModel: Model<ProgressDocument>,
  ) {}

  /**
   * ✅ IMPLEMENTADO - Obtiene los datos del dashboard
   */
  async getDashboard(studentId: string) {
    const student = await this.studentModel.findById(studentId).lean();
    if (!student) return null;

    const progressRecords = await this.progressModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .lean();

    const totalCourses = progressRecords.length;
    const completedCourses = progressRecords.filter(
      (p) => p.progressPercentage === 100,
    ).length;
    const inProgressCourses = progressRecords.filter(
      (p) => p.progressPercentage > 0 && p.progressPercentage < 100,
    ).length;
    const totalTimeSpent = progressRecords.reduce(
      (acc, p) => acc + (p.timeSpentMinutes || 0),
      0,
    );

    // Obtener cursos recientes (últimos 3 accedidos)
    const recentProgress = await this.progressModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .sort({ lastAccessedAt: -1 })
      .limit(3)
      .populate('courseId')
      .lean();

    const recentCourses = recentProgress.map((p) => ({
      course: p.courseId,
      progress: p.progressPercentage,
      lastAccessed: p.lastAccessedAt,
    }));

    return {
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        preferences: student.preferences,
      },
      stats: {
        totalCourses,
        completedCourses,
        inProgressCourses,
        totalTimeSpentMinutes: totalTimeSpent,
        totalTimeSpentFormatted: this.formatTime(totalTimeSpent),
      },
      recentCourses,
    };
  }

  /**
   * ✅ IMPLEMENTADO - Obtiene cursos con progreso
   */
  async getCoursesWithProgress(studentId: string) {
    const courses = await this.courseModel.find().lean();
    const progressRecords = await this.progressModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .lean();

    const progressMap = new Map(
      progressRecords.map((p) => [p.courseId.toString(), p]),
    );

    return courses.map((course) => {
      const progress = progressMap.get(course._id.toString());
      return {
        ...course,
        progress: progress
          ? {
              completedLessons: progress.completedLessons,
              progressPercentage: progress.progressPercentage,
              lastAccessedAt: progress.lastAccessedAt,
              timeSpentMinutes: progress.timeSpentMinutes,
            }
          : null,
      };
    });
  }

  /**
   * 📝 TODO: Implementar estadísticas detalladas
   *
   * El candidato debe implementar este método para retornar:
   * - totalStudyHours: Total de horas de estudio
   * - completedVsInProgress: { completed: number, inProgress: number }
   * - studyStreak: Días consecutivos de estudio
   * - weeklyAverageProgress: Promedio de progreso semanal
   * - timeByCategory: { [category: string]: number } - minutos por categoría
   *
   * Hints:
   * - Usar agregaciones de MongoDB ($group, $sum, etc.)
   * - Para la racha, calcular días consecutivos desde hoy hacia atrás
   * - Considerar usar lookup para unir Progress con Course
   */
  async getDetailedStats(studentId: string) {
    if (!Types.ObjectId.isValid(studentId)) {
      return null;
    }

    const student = await this.findById(studentId);
    if (!student) {
      return null;
    }

    const progressRecords = await this.progressModel
      .find({ studentId: new Types.ObjectId(studentId) })
      .lean();

    const totalMinutes = progressRecords.reduce(
      (acc, p) => acc + (p.timeSpentMinutes || 0),
      0,
    );

    const totalStudyHours = Math.round((totalMinutes / 60) * 10) / 10;

    const completedCourses = progressRecords.filter(
      (p) => p.progressPercentage === 100,
    ).length;
    const inProgressCourses = progressRecords.filter(
      (p) => p.progressPercentage > 0 && p.progressPercentage < 100,
    ).length;

    const studyStreak = await this.calculateStudyStreak(studentId);

    const weeklyAverageProgress = await this.calculateWeeklyAverage(studentId);

    const timeByCategory = await this.progressModel.aggregate([
      {
        $match: { studentId: new Types.ObjectId(studentId) },
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course',
        },
      },
      {
        $unwind: '$course',
      },
      {
        $group: {
          _id: '$course.category',
          totalMinutes: { $sum: '$timeSpentMinutes' },
        },
      },
    ]);

    const timeByCategoryObject = timeByCategory.reduce(
      (acc, item) => {
        acc[item._id] = item.totalMinutes;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalStudyHours,
      completedVsInProgress: {
        completed: completedCourses,
        inProgress: inProgressCourses,
      },
      studyStreak,
      weeklyAverageProgress,
      timeByCategory: timeByCategoryObject,
    };
  }

  /**
   * 📝 TODO: Implementar actualización de preferencias
   *
   * El candidato debe:
   * 1. Buscar el estudiante por ID ✅
   * 2. Hacer un merge de las preferencias existentes con las nuevas ✅
   * 3. Guardar y retornar el estudiante actualizado ✅
   * 4. Manejar el caso de estudiante no encontrado (retornar null) ✅
   *
   * Hint: Usar findByIdAndUpdate con { new: true } para retornar el documento actualizado ✅
   */
  async updatePreferences(studentId: string, dto: UpdatePreferencesDto) {
    if (!Types.ObjectId.isValid(studentId)) {
      return null;
    }

    // Send only preference to update
    const updateFields = Object.entries(dto)
      .filter(([_, value]) => value !== undefined)
      .reduce(
        (acc, [key, value]) => {
          acc[`preferences.${key}`] = value;
          return acc;
        },
        {} as Record<string, any>,
      );

    if (Object.keys(updateFields).length === 0) {
      return this.studentModel.findById(studentId).lean();
    }

    const student = await this.studentModel
      .findByIdAndUpdate(
        studentId,
        { $set: updateFields },
        {
          new: true,
          runValidators: true,
        },
      )
      .lean();

    return student;
  }

  /**
   * Helper para formatear tiempo
   */
  private formatTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Método auxiliar para buscar un estudiante por ID
   */
  async findById(id: string) {
    return this.studentModel.findById(id).lean();
  }

  /**
   * Calculate consecutive days of study from today backwards.Z
   */
  private async calculateStudyStreak(studentId: string): Promise<number> {
    const progressRecords = await this.progressModel
      .find({
        studentId: new Types.ObjectId(studentId),
        lastAccessedAt: { $exists: true, $ne: null },
      })
      .sort({ lastAccessedAt: -1 })
      .lean();

    if (progressRecords.length === 0) {
      return 0;
    }

    const accessDates = [
      ...new Set(
        progressRecords.map((p) => {
          const date = new Date(p.lastAccessedAt!);
          return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
          ).getTime();
        }),
      ),
    ].sort((a, b) => b - a); // order desc

    const today = new Date();
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    ).getTime();

    // if the most recent day is neither today nor yesterday, the streak is 0
    const mostRecentDate = accessDates[0];
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (mostRecentDate < todayMidnight - oneDayMs) {
      return 0;
    }

    let streak = 1;
    for (let i = 1; i < accessDates.length; i++) {
      const dayDiff = (accessDates[i - 1] - accessDates[i]) / oneDayMs;

      if (dayDiff === 1) {
        streak++;
      } else {
        break; // break streak
      }
    }

    return streak;
  }

  /**
   * Calculate average progress over the last week
   */
  private async calculateWeeklyAverage(studentId: string): Promise<number> {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recentProgress = await this.progressModel
      .find({
        studentId: new Types.ObjectId(studentId),
        lastAccessedAt: { $gte: oneWeekAgo },
      })
      .lean();

    if (recentProgress.length === 0) {
      return 0;
    }

    const totalProgress = recentProgress.reduce(
      (acc, p) => acc + p.progressPercentage,
      0,
    );

    return Math.round(totalProgress / recentProgress.length);
  }
}
