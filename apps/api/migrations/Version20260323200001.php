<?php declare(strict_types=1);

namespace Lodgik\Migrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260323200001 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'HR Phases B-K: documents, job history, recruitment, onboarding, leave policy, payroll components, performance goals, ESS, expense claims, training, offboarding';
    }

    public function up(Schema $schema): void
    {
        // ── Phase B: Employee Documents ──────────────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS employee_documents (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            employee_id     VARCHAR(36)  NOT NULL,
            document_type   VARCHAR(30)  NOT NULL DEFAULT 'other',
            title           VARCHAR(200) NOT NULL,
            file_url        VARCHAR(500),
            file_name       VARCHAR(200),
            expiry_date     DATE,
            notes           TEXT,
            uploaded_by     VARCHAR(36),
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_emp_doc_type CHECK (document_type IN
                ('contract','id_card','passport','certificate','degree','offer_letter',
                 'nda','insurance','medical','other'))
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_emp_docs_emp ON employee_documents (employee_id)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_emp_docs_tenant ON employee_documents (tenant_id)");

        // ── Phase B: Job History ────────────────────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS employee_job_history (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            employee_id     VARCHAR(36)  NOT NULL,
            job_title       VARCHAR(100) NOT NULL,
            department_id   VARCHAR(36),
            department_name VARCHAR(100),
            start_date      DATE         NOT NULL,
            end_date        DATE,
            change_type     VARCHAR(30)  NOT NULL DEFAULT 'hire',
            change_reason   TEXT,
            gross_salary    BIGINT       NOT NULL DEFAULT 0,
            created_by      VARCHAR(36),
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_emp_history_emp ON employee_job_history (employee_id)");

        // ── Phase C: Recruitment — Job Openings ─────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS job_openings (
            id                  VARCHAR(36)  PRIMARY KEY,
            tenant_id           VARCHAR(36)  NOT NULL,
            property_id         VARCHAR(36)  NOT NULL,
            title               VARCHAR(150) NOT NULL,
            department_id       VARCHAR(36),
            employment_type     VARCHAR(20)  NOT NULL DEFAULT 'permanent',
            description         TEXT,
            requirements        TEXT,
            vacancies           SMALLINT     NOT NULL DEFAULT 1,
            salary_min          BIGINT,
            salary_max          BIGINT,
            deadline            DATE,
            status              VARCHAR(20)  NOT NULL DEFAULT 'open',
            posted_by           VARCHAR(36),
            created_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
            updated_at          TIMESTAMP    NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_job_status CHECK (status IN ('draft','open','paused','closed','filled'))
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_job_openings_tenant ON job_openings (tenant_id, status)");

        // ── Phase C: Recruitment — Job Applications ──────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS job_applications (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            job_opening_id  VARCHAR(36)  NOT NULL REFERENCES job_openings(id) ON DELETE CASCADE,
            applicant_name  VARCHAR(150) NOT NULL,
            applicant_email VARCHAR(320),
            applicant_phone VARCHAR(30),
            cv_url          VARCHAR(500),
            cover_note      TEXT,
            status          VARCHAR(30)  NOT NULL DEFAULT 'applied',
            interview_date  TIMESTAMP,
            offer_date      DATE,
            offer_salary    BIGINT,
            rejection_reason TEXT,
            notes           TEXT,
            reviewed_by     VARCHAR(36),
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_app_status CHECK (status IN
                ('applied','screened','interview_scheduled','interview_done',
                 'offer_made','hired','rejected','withdrawn'))
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_job_apps_opening ON job_applications (job_opening_id, status)");

        // ── Phase C: Onboarding Checklist ───────────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS onboarding_checklists (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            employee_id     VARCHAR(36)  NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            title           VARCHAR(150) NOT NULL,
            description     TEXT,
            category        VARCHAR(50)  NOT NULL DEFAULT 'general',
            due_date        DATE,
            completed_at    TIMESTAMP,
            completed_by    VARCHAR(36),
            assigned_to     VARCHAR(36),
            is_mandatory    BOOLEAN      NOT NULL DEFAULT TRUE,
            sort_order      SMALLINT     NOT NULL DEFAULT 0,
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_onboarding_emp ON onboarding_checklists (employee_id)");

        // ── Phase E: Leave Policy ───────────────────────────────────────
        $this->addSql("ALTER TABLE leave_types
            ADD COLUMN IF NOT EXISTS carry_forward_days   SMALLINT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS carry_forward_expiry SMALLINT NOT NULL DEFAULT 90,
            ADD COLUMN IF NOT EXISTS encashable           BOOLEAN  NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS requires_approval    BOOLEAN  NOT NULL DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS notice_days          SMALLINT NOT NULL DEFAULT 1,
            ADD COLUMN IF NOT EXISTS max_consecutive_days SMALLINT,
            ADD COLUMN IF NOT EXISTS gender_restriction   VARCHAR(10),
            ADD COLUMN IF NOT EXISTS is_active            BOOLEAN  NOT NULL DEFAULT TRUE
        ");
        $this->addSql("ALTER TABLE leave_requests
            ADD COLUMN IF NOT EXISTS half_day             BOOLEAN  NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS half_day_period      VARCHAR(10),
            ADD COLUMN IF NOT EXISTS handover_to          VARCHAR(36),
            ADD COLUMN IF NOT EXISTS handover_notes       TEXT
        ");

        // ── Phase D: Attendance enhancements ────────────────────────────
        $this->addSql("ALTER TABLE attendance_records
            ADD COLUMN IF NOT EXISTS overtime_hours  DECIMAL(5,2) NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS overtime_type   VARCHAR(20),
            ADD COLUMN IF NOT EXISTS check_in_method VARCHAR(20) NOT NULL DEFAULT 'manual',
            ADD COLUMN IF NOT EXISTS early_leave     BOOLEAN     NOT NULL DEFAULT FALSE
        ");

        // ── Phase F: Payroll Components ──────────────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS payroll_components (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            name            VARCHAR(100) NOT NULL,
            code            VARCHAR(20)  NOT NULL,
            component_type  VARCHAR(20)  NOT NULL DEFAULT 'earning',
            calculation     VARCHAR(20)  NOT NULL DEFAULT 'fixed',
            value           BIGINT       NOT NULL DEFAULT 0,
            is_taxable      BOOLEAN      NOT NULL DEFAULT TRUE,
            is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
            sort_order      SMALLINT     NOT NULL DEFAULT 0,
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_comp_type   CHECK (component_type IN ('earning','deduction','benefit')),
            CONSTRAINT chk_comp_calc   CHECK (calculation     IN ('fixed','percent_of_basic','percent_of_gross'))
        )");
        $this->addSql("CREATE UNIQUE INDEX IF NOT EXISTS uq_payroll_comp_code ON payroll_components (tenant_id, code)");

        $this->addSql("ALTER TABLE payroll_items
            ADD COLUMN IF NOT EXISTS components  JSONB NOT NULL DEFAULT '{}',
            ADD COLUMN IF NOT EXISTS allowances  BIGINT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS deductions  BIGINT NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS loan_deduction BIGINT NOT NULL DEFAULT 0
        ");

        // ── Phase G: Performance Goals ───────────────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS performance_goals (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            employee_id     VARCHAR(36)  NOT NULL,
            review_id       VARCHAR(36),
            title           VARCHAR(200) NOT NULL,
            description     TEXT,
            category        VARCHAR(50)  NOT NULL DEFAULT 'kra',
            weight          SMALLINT     NOT NULL DEFAULT 10,
            target_value    DECIMAL(12,2),
            actual_value    DECIMAL(12,2),
            unit            VARCHAR(30),
            due_date        DATE,
            status          VARCHAR(20)  NOT NULL DEFAULT 'active',
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_goal_status CHECK (status IN ('active','achieved','missed','cancelled'))
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_perf_goals_emp ON performance_goals (employee_id)");

        $this->addSql("CREATE TABLE IF NOT EXISTS performance_feedback (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            review_id       VARCHAR(36)  NOT NULL,
            from_user_id    VARCHAR(36)  NOT NULL,
            from_name       VARCHAR(150) NOT NULL,
            feedback_type   VARCHAR(20)  NOT NULL DEFAULT 'peer',
            strengths       TEXT,
            improvements    TEXT,
            rating          SMALLINT,
            is_anonymous    BOOLEAN      NOT NULL DEFAULT FALSE,
            submitted_at    TIMESTAMP,
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_fb_type CHECK (feedback_type IN ('self','peer','manager','subordinate','360'))
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_perf_fb_review ON performance_feedback (review_id)");

        // ── Phase I: Expense Claims ──────────────────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS expense_claims (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            property_id     VARCHAR(36)  NOT NULL,
            employee_id     VARCHAR(36)  NOT NULL,
            employee_name   VARCHAR(150) NOT NULL,
            claim_number    VARCHAR(30)  NOT NULL,
            title           VARCHAR(200) NOT NULL,
            total_amount    BIGINT       NOT NULL DEFAULT 0,
            currency        VARCHAR(3)   NOT NULL DEFAULT 'NGN',
            status          VARCHAR(20)  NOT NULL DEFAULT 'draft',
            submitted_at    TIMESTAMP,
            approved_at     TIMESTAMP,
            approved_by     VARCHAR(36),
            rejection_reason TEXT,
            paid_at         TIMESTAMP,
            notes           TEXT,
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_claim_status CHECK (status IN ('draft','submitted','approved','rejected','paid'))
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_expense_claims_emp ON expense_claims (employee_id, status)");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_expense_claims_prop ON expense_claims (property_id, status)");

        $this->addSql("CREATE TABLE IF NOT EXISTS expense_claim_items (
            id              VARCHAR(36)  PRIMARY KEY,
            claim_id        VARCHAR(36)  NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
            category        VARCHAR(50)  NOT NULL DEFAULT 'other',
            description     VARCHAR(300) NOT NULL,
            amount          BIGINT       NOT NULL DEFAULT 0,
            expense_date    DATE         NOT NULL,
            receipt_url     VARCHAR(500),
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_claim_items_claim ON expense_claim_items (claim_id)");

        // ── Phase J: Training ────────────────────────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS training_programs (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            property_id     VARCHAR(36)  NOT NULL,
            title           VARCHAR(200) NOT NULL,
            category        VARCHAR(50)  NOT NULL DEFAULT 'skills',
            mode            VARCHAR(20)  NOT NULL DEFAULT 'in_house',
            provider        VARCHAR(150),
            description     TEXT,
            duration_hours  DECIMAL(6,2),
            cost_per_head   BIGINT       NOT NULL DEFAULT 0,
            start_date      DATE,
            end_date        DATE,
            max_participants SMALLINT,
            status          VARCHAR(20)  NOT NULL DEFAULT 'planned',
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW(),
            CONSTRAINT chk_training_status CHECK (status IN ('planned','ongoing','completed','cancelled'))
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_training_tenant ON training_programs (tenant_id, status)");

        $this->addSql("CREATE TABLE IF NOT EXISTS training_enrollments (
            id              VARCHAR(36)  PRIMARY KEY,
            program_id      VARCHAR(36)  NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
            employee_id     VARCHAR(36)  NOT NULL,
            employee_name   VARCHAR(150) NOT NULL,
            enrolled_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
            completed_at    TIMESTAMP,
            completion_pct  SMALLINT     NOT NULL DEFAULT 0,
            score           DECIMAL(5,2),
            certificate_url VARCHAR(500),
            status          VARCHAR(20)  NOT NULL DEFAULT 'enrolled',
            notes           TEXT,
            CONSTRAINT chk_enroll_status CHECK (status IN ('enrolled','in_progress','completed','dropped'))
        )");
        $this->addSql("CREATE UNIQUE INDEX IF NOT EXISTS uq_training_enrollment ON training_enrollments (program_id, employee_id)");

        // ── Phase K: Offboarding ─────────────────────────────────────────
        $this->addSql("CREATE TABLE IF NOT EXISTS offboarding_checklists (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            employee_id     VARCHAR(36)  NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
            title           VARCHAR(150) NOT NULL,
            category        VARCHAR(50)  NOT NULL DEFAULT 'general',
            description     TEXT,
            is_mandatory    BOOLEAN      NOT NULL DEFAULT TRUE,
            assigned_to     VARCHAR(36),
            assigned_name   VARCHAR(150),
            due_date        DATE,
            completed_at    TIMESTAMP,
            completed_by    VARCHAR(36),
            notes           TEXT,
            sort_order      SMALLINT     NOT NULL DEFAULT 0,
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_offboard_emp ON offboarding_checklists (employee_id)");

        $this->addSql("CREATE TABLE IF NOT EXISTS exit_interviews (
            id              VARCHAR(36)  PRIMARY KEY,
            tenant_id       VARCHAR(36)  NOT NULL,
            employee_id     VARCHAR(36)  NOT NULL,
            employee_name   VARCHAR(150) NOT NULL,
            interviewer_id  VARCHAR(36),
            interviewer_name VARCHAR(150),
            interview_date  DATE,
            last_work_date  DATE,
            reason_for_leaving VARCHAR(50),
            rating_overall  SMALLINT,
            would_return    BOOLEAN,
            key_feedback    TEXT,
            improvements    TEXT,
            created_at      TIMESTAMP    NOT NULL DEFAULT NOW()
        )");
        $this->addSql("CREATE INDEX IF NOT EXISTS idx_exit_interview_emp ON exit_interviews (employee_id)");
    }

    public function down(Schema $schema): void
    {
        foreach ([
            'exit_interviews','offboarding_checklists',
            'training_enrollments','training_programs',
            'expense_claim_items','expense_claims',
            'performance_feedback','performance_goals',
            'payroll_components',
            'onboarding_checklists','job_applications','job_openings',
            'employee_job_history','employee_documents',
        ] as $table) {
            $this->addSql("DROP TABLE IF EXISTS {$table}");
        }
    }
}
