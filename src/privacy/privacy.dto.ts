import { IsIn, IsOptional, IsString, Length } from "class-validator";

export class ApproveRopaDto {
  @IsString()
  @Length(1, 20)
  version!: string;

  @IsIn(["VALIDATED", "REJECTED"])
  decision!: "VALIDATED" | "REJECTED";

  @IsOptional()
  @IsString()
  @Length(0, 500)
  notes?: string;
}
