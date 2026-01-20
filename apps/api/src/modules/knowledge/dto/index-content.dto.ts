import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class IndexContentDto {
  @ApiProperty({
    description: 'ID del curso',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @ApiProperty({ description: 'Contenido extraído del PDF' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Nombre del archivo fuente',
    example: 'javascript-fundamentals.pdf',
  })
  @IsString()
  @IsNotEmpty()
  sourceFile: string;
}
