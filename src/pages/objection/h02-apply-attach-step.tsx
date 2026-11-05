import {
  MAX_EVIDENCE_COUNT,
  OBJECTION_FILE_ACCEPT,
} from "@/entities/payment-stop"
import { FileAttach } from "@/shared/ui/file-attach"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import type { ApplyFiles } from "@/pages/objection/h02-apply-draft"

type Props = {
  files: ApplyFiles
  checking: "idCopy" | "evidence" | null
  onSelectIdCopy: (picked: File[]) => void
  onSelectEvidence: (picked: File[]) => void
  onRemoveIdCopy: () => void
  onRemoveEvidence: (index: number) => void
}

export const ID_COPY_INPUT_ID = "apply-id-copy"

/** 2단계 서류 첨부. 신분증 사본(필수 1개)과 증빙 서류(0~9개). */
export const ApplyAttachStep = ({
  files,
  checking,
  onSelectIdCopy,
  onSelectEvidence,
  onRemoveIdCopy,
  onRemoveEvidence,
}: Props) => (
  <FormSection title="첨부 서류" className="mb-0">
    <FormRow label="신분증 사본" htmlFor={ID_COPY_INPUT_ID} required>
      <FileAttach
        id={ID_COPY_INPUT_ID}
        label="신분증 사본"
        accept={OBJECTION_FILE_ACCEPT}
        files={files.idCopy}
        busy={checking === "idCopy"}
        errors={files.idCopyErrors}
        required
        hint="주민등록증, 운전면허증, 여권 중 하나를 1개 올립니다. 주민등록번호 뒷자리는 가리고 올리세요. 신분증 사본은 암호화해 보관하고 본인 확인에만 씁니다."
        onSelect={onSelectIdCopy}
        onRemove={onRemoveIdCopy}
      />
    </FormRow>
    <FormRow label="증빙 서류" htmlFor="apply-evidence">
      <FileAttach
        id="apply-evidence"
        label="증빙 서류"
        accept={OBJECTION_FILE_ACCEPT}
        multiple
        files={files.evidence}
        busy={checking === "evidence"}
        errors={files.evidenceErrors}
        hint={`정당한 거래임을 보여 주는 서류를 ${MAX_EVIDENCE_COUNT}개까지 올립니다. 예: 거래상대방과의 대화 내역, 계약서, 세금계산서, 거래명세서`}
        onSelect={onSelectEvidence}
        onRemove={onRemoveEvidence}
      />
    </FormRow>
  </FormSection>
)
