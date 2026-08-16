import {
  IsDefined,
  IsIn,
  IsISO31661Alpha2,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from "class-validator";
import {
  JURISDICTION_TYPES,
  MANAGEMENT_BLOCKS,
  type JurisdictionType,
  type ManagementBlock,
} from "./country-groups";

export class CreateJurisdictionDto {
  @IsISO31661Alpha2()
  countryCode!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsIn(MANAGEMENT_BLOCKS)
  managementBlock!: ManagementBlock;

  @IsIn(JURISDICTION_TYPES)
  jurisdictionType!: JurisdictionType;

  @ValidateIf(
    (input: CreateJurisdictionDto) =>
      input.jurisdictionType !== "SOVEREIGN_STATE",
  )
  @IsDefined()
  @IsISO31661Alpha2()
  sovereignAuthorityCode?: string;
}

export class UpdateJurisdictionDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}
