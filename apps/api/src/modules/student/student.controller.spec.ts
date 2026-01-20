import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

describe('StudentController', () => {
  let controller: StudentController;
  let service: StudentService;

  const mockStudentService = {
    getDashboard: jest.fn(),
    getCoursesWithProgress: jest.fn(),
    getDetailedStats: jest.fn(),
    updatePreferences: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        {
          provide: StudentService,
          useValue: mockStudentService,
        },
      ],
    }).compile();

    controller = module.get<StudentController>(StudentController);
    service = module.get<StudentService>(StudentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboard', () => {
    /**
     * ✅ TEST QUE PASA - Verifica que el dashboard retorna datos correctamente
     */
    it('should return dashboard data for valid student', async () => {
      const mockDashboard = {
        student: {
          id: '507f1f77bcf86cd799439011',
          name: 'María García',
          email: 'maria@test.com',
        },
        stats: {
          totalCourses: 5,
          completedCourses: 1,
          inProgressCourses: 2,
          totalTimeSpentMinutes: 565,
          totalTimeSpentFormatted: '9h 25m',
        },
        recentCourses: [],
      };

      mockStudentService.getDashboard.mockResolvedValue(mockDashboard);

      const result = await controller.getDashboard('507f1f77bcf86cd799439011');

      expect(result).toEqual(mockDashboard);
      expect(service.getDashboard).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
      );
    });

    /**
     * ✅ TEST QUE PASA - Verifica que se lanza NotFoundException para estudiante inexistente
     */
    it('should throw NotFoundException when student not found', async () => {
      mockStudentService.getDashboard.mockResolvedValue(null);

      await expect(controller.getDashboard('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCourses', () => {
    /**
     * ✅ TEST QUE PASA - Verifica que se obtienen cursos con progreso
     */
    it('should return courses with progress', async () => {
      const mockCourses = [
        {
          _id: 'course1',
          title: 'React desde Cero',
          progress: { progressPercentage: 70 },
        },
        {
          _id: 'course2',
          title: 'Node.js',
          progress: null,
        },
      ];

      mockStudentService.getCoursesWithProgress.mockResolvedValue(mockCourses);

      const result = await controller.getCourses('507f1f77bcf86cd799439011');

      expect(result).toHaveLength(2);
      expect(result[0].progress?.progressPercentage).toBe(70);
    });
  });

  /**
   * 📝 TODO: El candidato debe implementar estos tests
   */
  describe('getStats', () => {
    const mockStats = {
      totalStudyHours: 9.4,
      completedVsInProgress: {
        completed: 1,
        inProgress: 2,
      },
      studyStreak: 3,
      weeklyAverageProgress: 51,
      timeByCategory: {
        Programación: 475,
        Frontend: 280,
        Backend: 90,
      },
    };

    it('should return detailed statistics for student', async () => {
      const studentId = '507f1f77bcf86cd799439011';
      mockStudentService.getDetailedStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(studentId);

      expect(mockStudentService.getDetailedStats).toHaveBeenCalledWith(
        studentId,
      );
      expect(result).toEqual(mockStats);
      expect(result.totalStudyHours).toBe(9.4);
    });

    it('should calculate study streak correctly', async () => {
      const studentId = '507f1f77bcf86cd799439011';
      const statsWithStreak = {
        ...mockStats,
        studyStreak: 7,
      };
      mockStudentService.getDetailedStats.mockResolvedValue(statsWithStreak);

      const result = await controller.getStats(studentId);

      expect(result.studyStreak).toBe(7);
      expect(typeof result.studyStreak).toBe('number');
    });

    it('should aggregate time by category', async () => {
      const studentId = '507f1f77bcf86cd799439011';
      mockStudentService.getDetailedStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(studentId);

      expect(result.timeByCategory).toBeDefined();
      expect(result.timeByCategory['Programación']).toBe(475);
      expect(result.timeByCategory['Frontend']).toBe(280);
      expect(result.timeByCategory['Backend']).toBe(90);
      expect(typeof result.timeByCategory).toBe('object');
    });

    it('should handle student with no courses', async () => {
      const studentId = '507f1f77bcf86cd799439011';
      const emptyStats = {
        totalStudyHours: 0,
        completedVsInProgress: {
          completed: 0,
          inProgress: 0,
        },
        studyStreak: 0,
        weeklyAverageProgress: 0,
        timeByCategory: {},
      };
      mockStudentService.getDetailedStats.mockResolvedValue(emptyStats);

      const result = await controller.getStats(studentId);

      expect(result.totalStudyHours).toBe(0);
      expect(result.completedVsInProgress.completed).toBe(0);
      expect(result.completedVsInProgress.inProgress).toBe(0);
      expect(result.studyStreak).toBe(0);
      expect(Object.keys(result.timeByCategory)).toHaveLength(0);
    });

    it('should throw NotFoundException when student not found', async () => {
      const studentId = 'invalid-id';
      mockStudentService.getDetailedStats.mockResolvedValue(null);

      await expect(controller.getStats(studentId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getStats(studentId)).rejects.toThrow(
        'Student not found',
      );
    });
  });

  describe('updatePreferences', () => {
    const mockStudent = {
      _id: '507f1f77bcf86cd799439011',
      name: 'María García',
      email: 'maria@test.com',
      preferences: {
        theme: 'dark',
        language: 'es',
        notifications: true,
      },
    };

    it('should update student preferences', async () => {
      const studentId = '507f1f77bcf86cd799439011';
      const updateDto = {
        theme: 'dark' as const,
        language: 'en' as 'en' | 'es',
        notifications: false,
      };
      mockStudentService.updatePreferences.mockResolvedValue(mockStudent);

      const result = await controller.updatePreferences(studentId, updateDto);

      expect(mockStudentService.updatePreferences).toHaveBeenCalledWith(
        studentId,
        updateDto,
      );
      expect(result).toEqual(mockStudent);
    });

    it('should merge partial preferences update', async () => {
      const studentId = '507f1f77bcf86cd799439011';
      const partialUpdate = {
        theme: 'light' as const,
      };
      const updatedStudent = {
        ...mockStudent,
        preferences: {
          ...mockStudent.preferences,
          theme: 'light',
        },
      };
      mockStudentService.updatePreferences.mockResolvedValue(updatedStudent);

      const result = await controller.updatePreferences(
        studentId,
        partialUpdate,
      );

      expect(mockStudentService.updatePreferences).toHaveBeenCalledWith(
        studentId,
        partialUpdate,
      );
      expect(result.preferences.theme).toBe('light');

      expect(result.preferences.language).toBe('es');
      expect(result.preferences.notifications).toBe(true);
    });

    it('should validate theme value', async () => {
      const studentId = '507f1f77bcf86cd799439011';
      const validUpdate = {
        theme: 'dark' as const,
      };
      mockStudentService.updatePreferences.mockResolvedValue(mockStudent);

      const result = await controller.updatePreferences(studentId, validUpdate);

      expect(result).toBeDefined();
      expect(['light', 'dark']).toContain(result.preferences.theme);
    });

    it('should throw NotFoundException for invalid student', async () => {
      const invalidId = 'invalid-student-id';
      const updateDto = {
        theme: 'dark' as const,
      };
      mockStudentService.updatePreferences.mockResolvedValue(null);

      await expect(
        controller.updatePreferences(invalidId, updateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.updatePreferences(invalidId, updateDto),
      ).rejects.toThrow('Student not found');
    });

    it('should handle empty update DTO', async () => {
      const studentId = '507f1f77bcf86cd799439011';
      const emptyUpdate = {};
      mockStudentService.updatePreferences.mockResolvedValue(mockStudent);

      const result = await controller.updatePreferences(studentId, emptyUpdate);

      expect(mockStudentService.updatePreferences).toHaveBeenCalledWith(
        studentId,
        emptyUpdate,
      );
      expect(result).toEqual(mockStudent);
    });
  });
});
