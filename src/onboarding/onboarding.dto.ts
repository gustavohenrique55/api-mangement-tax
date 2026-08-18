import { IsString, Length } from "class-validator";

export class CreateTenantDto {
  @IsString()
  @Length(1, 200)
  tenantId!: string;

  @IsString()
  @Length(2, 160)
  displayName!: string;
}
