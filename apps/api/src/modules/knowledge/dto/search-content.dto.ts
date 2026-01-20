import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class SearchContentDto {
  @ApiProperty({
    description: 'Query de busqueda',
    example: 'Quees un closure en JavaScript?',
  })
  @IsString()
  @IsNotEmpty()
  q: string;

  @ApiProperty({
    description: 'ID del curso (opcional)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsString()
  @IsOptional()
  courseId?: string;

  @ApiProperty({
    description: 'Numero de resultados',
    example: 5,
    required: false,
    minimum: 1,
    maximum: 20,
  })
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiProperty({
    description: 'Score minimo de similitud',
    example: 0.7,
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  @Type(() => Number)
  minScore?: number;
}
