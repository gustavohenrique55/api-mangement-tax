import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  Length,
} from "class-validator";

export class CreateTenantDto {
  @IsString()
  @Length(1, 200)
  tenantId!: string;

  @IsString()
  @Length(2, 160)
  displayName!: string;
}

export class CreateUserDto {
  @IsString()
  @Length(1, 200)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(1, 200)
  tenantId!: string;

  @IsArray()
  @IsString({ each: true })
  roles: string[] = [];

  @IsArray()
  @IsString({ each: true })
  countryScopes: string[] = [];

  @IsOptional()
  @IsString()
  @Length(8, 200)
  temporaryPassword?: string;
}
