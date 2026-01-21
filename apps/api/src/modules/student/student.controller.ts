import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { StudentService } from './student.service';

@ApiTags('students')
@Controller('students')
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  /**
   * ✅ IMPLEMENTADO - Endpoint del dashboard principal
   * Retorna información resumida del estudiante para el dashboard
   */
  @Get(':id/dashboard')
  @ApiOperation({ summary: 'Obtener datos del dashboard del estudiante' })
  @ApiParam({ name: 'id', description: 'ID del estudiante' })
  @ApiResponse({ status: 200, description: 'Datos del dashboard' })
  @ApiResponse({ status: 404, description: 'Estudiante no encontrado' })
  async getDashboard(@Param('id') id: string) {
    const dashboard = await this.studentService.getDashboard(id);
    if (!dashboard) {
      throw new NotFoundException(`Estudiante no encontrado`);
    }
    return dashboard;
  }

  /**
   * ✅ IMPLEMENTADO - Obtener cursos del estudiante con progreso
   */
  @Get(':id/courses')
  @ApiOperation({ summary: 'Obtener cursos del estudiante con progreso' })
  @ApiParam({ name: 'id', description: 'ID del estudiante' })
  @ApiResponse({ status: 200, description: 'Lista de cursos con progreso' })
  async getCourses(@Param('id') id: string) {
    return this.studentService.getCoursesWithProgress(id);
  }

  /**
   * 📝 TODO: Implementar endpoint de estadísticas
   *
   * Este endpoint debe retornar estadísticas detalladas del estudiante:
   * - Total de horas de estudio ✅
   * - Cursos completados vs en progreso ✅
   * - Racha de días consecutivos de estudio ✅
   * - Promedio de progreso semanal ✅
   * - Distribución de tiempo por categoría de curso ✅
   *
   * Hint: Usar agregaciones de MongoDB para calcular las estadísticas
   */
  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas detalladas del estudiante' })
  @ApiParam({ name: 'id', description: 'ID del estudiante' })
  @ApiResponse({ status: 200, description: 'Estadísticas del estudiante' })
  async getStats(@Param('id') id: string) {
    const stats = await this.studentService.getDetailedStats(id);

    if (!stats) {
      throw new NotFoundException('Student not found');
    }

    return stats;
  }

  /**
   * 📝 TODO: Implementar actualización de preferencias
   *
   * Este endpoint debe:
   * - Validar que las preferencias sean válidas (usar el DTO) ✅
   * - Actualizar solo los campos proporcionados (merge parcial) ✅
   * - Retornar el estudiante actualizado ✅
   * - Manejar el caso de estudiante no encontrado ✅
   */
  @Patch(':id/preferences')
  @ApiOperation({ summary: 'Actualizar preferencias del estudiante' })
  @ApiParam({ name: 'id', description: 'ID del estudiante' })
  @ApiResponse({ status: 200, description: 'Preferencias actualizadas' })
  @ApiResponse({ status: 404, description: 'Estudiante no encontrado' })
  async updatePreferences(
    @Param('id') id: string,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    const student = await this.studentService.updatePreferences(
      id,
      updatePreferencesDto,
    );

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    return student;
  }
}
