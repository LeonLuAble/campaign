import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ListTranslationsQueryDto {
  @IsString()
  @MaxLength(16)
  locale: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  namespace?: string;
}
