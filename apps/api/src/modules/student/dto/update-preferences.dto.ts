import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ enum: ['light', 'dark'] })
  @IsOptional()
  @IsIn(['light', 'dark'])
  theme?: 'light' | 'dark';

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['en', 'es'])
  language?: 'en' | 'es';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifications?: boolean;
}
