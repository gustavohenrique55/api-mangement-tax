import { BadRequestException, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";
import { AuditService } from "../audit/audit.service";
import { ManagementRecordRepository } from "../database/management-record.repository";

const ROPA_VERSION = "2026-08";

@Injectable()
export class PrivacyService {
  constructor(
    private readonly audit: AuditService,
    private readonly records: ManagementRecordRepository,
  ) {}

  retentionPolicy() {
    return {
      dataRetentionDays: Number(process.env.DATA_RETENTION_DAYS ?? 3650),
      auditRetentionDays: Number(process.env.AUDIT_RETENTION_DAYS ?? 3650),
      auditImmutable: true,
      legalBasis:
        "LGPD art. 16 — a trilha de auditoria é retida por obrigação legal/regulatória e é imutável",
      legalBasisGdpr:
        "GDPR art. 17(3)(b) e (e) — retenção para cumprimento de obrigação legal e exercício/defesa de direitos; aplicável a titulares vinculados a territórios da UE (Guadalupe, Martinica, Guiana Francesa)",
    };
  }

  // Registro de Operações de Tratamento (ROPA) / base para RIPD.
  // Conteúdo é modelo técnico e requer validação do DPO/jurídico.
  async processingActivities(request: Request) {
    const tenantId = request.actor!.tenantId;
    const approvals = await this.records.list("ropaApprovals", tenantId);
    const latest = approvals
      .filter((approval) => approval.version === ROPA_VERSION)
      .at(-1);
    return {
      version: ROPA_VERSION,
      legalValidationStatus:
        (latest?.decision as string | undefined) ?? "PENDING_DPO_REVIEW",
      approvedBy: (latest?.approvedBy as string | undefined) ?? null,
      approvedAt: (latest?.approvedAt as string | undefined) ?? null,
      reviewNotes: (latest?.notes as string | undefined) ?? null,
      disclaimer:
        "Modelo técnico versionado; a base legal, salvaguardas e transferências internacionais devem ser validadas pelo DPO/jurídico. Para titulares vinculados a territórios da UE (Guadalupe, Martinica, Guiana Francesa) e a demais jurisdições com legislação própria de proteção de dados, aplicam-se o GDPR e as leis locais em conjunto com a LGPD.",
      activities: this.ropaActivities(),
    };
  }

  async reviewProcessingActivities(
    request: Request,
    version: string,
    decision: "VALIDATED" | "REJECTED",
    notes?: string,
  ) {
    if (version !== ROPA_VERSION) {
      throw new BadRequestException(
        `ROPA version mismatch; the current version is ${ROPA_VERSION}`,
      );
    }
    const tenantId = request.actor!.tenantId;
    await this.audit.append(
      request,
      "ropa.reviewed",
      "processing-activities",
      version,
      { decision },
    );
    await this.records.create("ropaApprovals", {
      id: randomUUID(),
      tenantId,
      version,
      decision,
      approvedBy: request.actor!.subject,
      approvedAt: new Date().toISOString(),
      notes: notes ?? null,
      createdAt: new Date().toISOString(),
    });
    return this.processingActivities(request);
  }

  private ropaActivities() {
    return [
      {
        id: "audit-trail",
        purpose: "Registro imutável de operações para auditoria e compliance",
        dataCategories: ["identificador do operador", "metadados da ação"],
        legalBasis:
          "LGPD art. 7º, II — cumprimento de obrigação legal/regulatória",
        legalBasisGdpr:
          "GDPR art. 6(1)(c) — cumprimento de obrigação legal",
        retentionDays: Number(process.env.AUDIT_RETENTION_DAYS ?? 3650),
        internationalTransfer: {
          occurs: false,
          safeguards: null,
        },
      },
      {
        id: "operator-identity",
        purpose: "Autenticação e autorização de operadores (RBAC e escopos)",
        dataCategories: [
          "identificador do operador",
          "papéis",
          "escopos de país",
        ],
        legalBasis: "LGPD art. 7º, IX — legítimo interesse do controlador",
        legalBasisGdpr:
          "GDPR art. 6(1)(f) — legítimo interesse do controlador",
        retentionDays: Number(process.env.DATA_RETENTION_DAYS ?? 3650),
        internationalTransfer: {
          occurs: false,
          safeguards: null,
        },
      },
      {
        id: "multijurisdiction-governance",
        purpose: "Governança tributária multi-jurisdicional (LATAM e Caribe)",
        dataCategories: ["dados gerenciais tributários", "país/jurisdição"],
        legalBasis: "LGPD art. 7º, IX — legítimo interesse do controlador",
        legalBasisGdpr:
          "GDPR art. 6(1)(f) — legítimo interesse do controlador",
        retentionDays: Number(process.env.DATA_RETENTION_DAYS ?? 3650),
        internationalTransfer: {
          occurs: true,
          mechanism: "LGPD art. 33, VIII — cláusulas contratuais padrão",
          mechanismGdpr:
            "GDPR arts. 44-46 (Capítulo V) — cláusulas contratuais padrão (art. 46(2)(c)) ou decisão de adequação; aplicável a transferências que envolvam territórios da UE (Guadalupe, Martinica, Guiana Francesa)",
          note: "Transferência entre jurisdições LATAM/Caribe sujeita a avaliação de adequação e salvaguardas contratuais. Transferências de/para territórios da UE exigem base do Capítulo V do GDPR.",
        },
      },
    ];
  }

  async exportSubject(request: Request, subject: string) {
    const tenantId = request.actor!.tenantId;
    const events = await this.audit.list(tenantId);
    return {
      subject,
      tenantId,
      generatedAt: new Date().toISOString(),
      auditTrail: events.filter((event) => event.actorSubject === subject),
    };
  }

  async eraseSubject(request: Request, subject: string) {
    const tenantId = request.actor!.tenantId;
    const events = await this.audit.list(tenantId);
    const retained = events.filter(
      (event) => event.actorSubject === subject,
    ).length;
    const record = await this.audit.append(
      request,
      "privacy.erasure-executed",
      "data-subject",
      subject,
      { retainedAuditEvents: retained },
    );
    return {
      subject,
      tenantId,
      requestId: record.id,
      requestedBy: request.actor!.subject,
      requestedAt: record.occurredAt,
      status: "COMPLETED",
      erased: {
        mutableRecords: 0,
        note: "Nenhum armazenamento mutável de dados pessoais vinculado a este titular neste domínio.",
      },
      retainedForLegalObligation: {
        auditEvents: retained,
        legalBasis:
          "LGPD art. 16 — retenção obrigatória; a trilha de auditoria permanece imutável.",
        legalBasisGdpr:
          "GDPR art. 17(3)(b) e (e) — o direito ao apagamento não se aplica à retenção necessária para obrigação legal e para defesa de direitos.",
      },
    };
  }

  async purgeByRetention(request: Request, apply: boolean) {
    const tenantId = request.actor!.tenantId;
    const { retentionDays, cutoff, result } = await this.runPurge(
      tenantId,
      apply,
    );
    if (apply && result.purged > 0) {
      await this.audit.append(
        request,
        "privacy.retention-purge",
        "retention",
        `cutoff:${cutoff}`,
        { purged: result.purged },
      );
    }
    return this.report(tenantId, retentionDays, cutoff, result, apply);
  }

  async purgeForTenant(tenantId: string, apply: boolean) {
    const { retentionDays, cutoff, result } = await this.runPurge(
      tenantId,
      apply,
    );
    if (apply && result.purged > 0) {
      await this.audit.appendSystem(
        tenantId,
        "privacy.retention-purge",
        "retention",
        `cutoff:${cutoff}`,
        { purged: result.purged },
      );
    }
    return this.report(tenantId, retentionDays, cutoff, result, apply);
  }

  private async runPurge(tenantId: string, apply: boolean) {
    const retentionDays = Number(process.env.DATA_RETENTION_DAYS ?? 3650);
    const cutoff = new Date(
      Date.now() - retentionDays * 86_400_000,
    ).toISOString();
    const result = await this.records.purgeExpired(tenantId, cutoff, apply);
    return { retentionDays, cutoff, result };
  }

  private report(
    tenantId: string,
    retentionDays: number,
    cutoff: string,
    result: { eligible: string[]; purged: number },
    apply: boolean,
  ) {
    return {
      mode: apply ? "APPLIED" : "DRY_RUN",
      tenantId,
      retentionDays,
      cutoff,
      eligible: result.eligible.length,
      purged: result.purged,
      ids: result.eligible,
      note: "A trilha de auditoria é imutável e não é afetada por esta rotina (LGPD art. 16).",
    };
  }
}
