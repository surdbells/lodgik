<?php
declare(strict_types=1);
namespace Lodgik\Entity;

use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Lodgik\Entity\Traits\HasUuid;
use Lodgik\Entity\Traits\HasTimestamps;

#[ORM\Entity]
#[ORM\Table(name: 'merchant_kyc')]
#[ORM\Index(columns: ['merchant_id'], name: 'idx_mkyc_merchant')]
#[ORM\Index(columns: ['status'], name: 'idx_mkyc_status')]
#[ORM\HasLifecycleCallbacks]
class MerchantKyc
{
    use HasUuid; use HasTimestamps;

    #[ORM\Column(name: 'merchant_id', type: Types::STRING, length: 36)]
    private string $merchantId;
    #[ORM\Column(name: 'kyc_type', type: Types::STRING, length: 20)]
    private string $kycType = 'individual';
    #[ORM\Column(name: 'government_id_type', type: Types::STRING, length: 30, nullable: true)]
    private ?string $governmentIdType = null;
    #[ORM\Column(name: 'government_id_number', type: Types::STRING, length: 50, nullable: true)]
    private ?string $governmentIdNumber = null;
    #[ORM\Column(name: 'government_id_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $governmentIdUrl = null;
    #[ORM\Column(name: 'selfie_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $selfieUrl = null;
    #[ORM\Column(name: 'liveness_verified', type: Types::BOOLEAN)]
    private bool $livenessVerified = false;
    #[ORM\Column(name: 'proof_of_address_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $proofOfAddressUrl = null;
    #[ORM\Column(name: 'cac_certificate_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $cacCertificateUrl = null;
    #[ORM\Column(name: 'director_ids', type: Types::JSON, nullable: true)]
    private ?array $directorIds = null;
    #[ORM\Column(name: 'business_address_verification_url', type: Types::STRING, length: 500, nullable: true)]
    private ?string $businessAddressVerificationUrl = null;
    #[ORM\Column(name: 'company_bank_verified', type: Types::BOOLEAN)]
    private bool $companyBankVerified = false;
    #[ORM\Column(type: Types::STRING, length: 20)]
    private string $status = 'not_submitted';
    #[ORM\Column(name: 'rejection_reason', type: Types::TEXT, nullable: true)]
    private ?string $rejectionReason = null;
    #[ORM\Column(name: 'reviewed_by', type: Types::STRING, length: 36, nullable: true)]
    private ?string $reviewedBy = null;
    #[ORM\Column(name: 'reviewed_at', type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $reviewedAt = null;

    public function __construct() { $this->generateId(); }

    public function getMerchantId(): string { return $this->merchantId; }
    public function setMerchantId(string $v): self { $this->merchantId = $v; return $this; }
    public function getKycType(): string { return $this->kycType; }
    public function setKycType(string $v): self { $this->kycType = $v; return $this; }
    public function getGovernmentIdType(): ?string { return $this->governmentIdType; }
    public function setGovernmentIdType(?string $v): self { $this->governmentIdType = $v; return $this; }
    public function getGovernmentIdNumber(): ?string { return $this->governmentIdNumber; }
    public function setGovernmentIdNumber(?string $v): self { $this->governmentIdNumber = $v; return $this; }
    public function getGovernmentIdUrl(): ?string { return $this->governmentIdUrl; }
    public function setGovernmentIdUrl(?string $v): self { $this->governmentIdUrl = $v; return $this; }
    public function getSelfieUrl(): ?string { return $this->selfieUrl; }
    public function setSelfieUrl(?string $v): self { $this->selfieUrl = $v; return $this; }
    public function getLivenessVerified(): bool { return $this->livenessVerified; }
    public function setLivenessVerified(bool $v): self { $this->livenessVerified = $v; return $this; }
    public function getProofOfAddressUrl(): ?string { return $this->proofOfAddressUrl; }
    public function setProofOfAddressUrl(?string $v): self { $this->proofOfAddressUrl = $v; return $this; }
    public function getCacCertificateUrl(): ?string { return $this->cacCertificateUrl; }
    public function setCacCertificateUrl(?string $v): self { $this->cacCertificateUrl = $v; return $this; }
    public function getDirectorIds(): ?array { return $this->directorIds; }
    public function setDirectorIds(?array $v): self { $this->directorIds = $v; return $this; }
    public function getBusinessAddressVerificationUrl(): ?string { return $this->businessAddressVerificationUrl; }
    public function setBusinessAddressVerificationUrl(?string $v): self { $this->businessAddressVerificationUrl = $v; return $this; }
    public function getCompanyBankVerified(): bool { return $this->companyBankVerified; }
    public function setCompanyBankVerified(bool $v): self { $this->companyBankVerified = $v; return $this; }
    public function getStatus(): string { return $this->status; }
    public function setStatus(string $v): self { $this->status = $v; return $this; }
    public function getRejectionReason(): ?string { return $this->rejectionReason; }
    public function setRejectionReason(?string $v): self { $this->rejectionReason = $v; return $this; }
    public function getReviewedBy(): ?string { return $this->reviewedBy; }
    public function setReviewedBy(?string $v): self { $this->reviewedBy = $v; return $this; }
    public function getReviewedAt(): ?\DateTimeImmutable { return $this->reviewedAt; }
    public function setReviewedAt(?\DateTimeImmutable $v): self { $this->reviewedAt = $v; return $this; }

    public function toArray(): array
    {
        return [
            'id' => $this->getId(), 'merchant_id' => $this->merchantId, 'kyc_type' => $this->kycType,
            'government_id_type' => $this->governmentIdType, 'government_id_number' => $this->governmentIdNumber,
            'government_id_url' => $this->governmentIdUrl, 'selfie_url' => $this->selfieUrl,
            'liveness_verified' => $this->livenessVerified, 'proof_of_address_url' => $this->proofOfAddressUrl,
            'cac_certificate_url' => $this->cacCertificateUrl, 'director_ids' => $this->directorIds,
            'company_bank_verified' => $this->companyBankVerified, 'status' => $this->status,
            'rejection_reason' => $this->rejectionReason, 'reviewed_by' => $this->reviewedBy,
            'reviewed_at' => $this->reviewedAt?->format(\DateTimeInterface::ATOM),
            'created_at' => $this->getCreatedAt()->format(\DateTimeInterface::ATOM),
        ];
    }
}
