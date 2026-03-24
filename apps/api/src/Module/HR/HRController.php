<?php declare(strict_types=1);

namespace Lodgik\Module\HR;

use Lodgik\Entity\Employee;
use Lodgik\Entity\EmployeeDocument;
use Lodgik\Entity\EmployeeJobHistory;
use Lodgik\Entity\JobOpening;
use Lodgik\Entity\JobApplication;
use Lodgik\Entity\OnboardingChecklist;
use Lodgik\Entity\PayrollComponent;
use Lodgik\Entity\PerformanceGoal;
use Lodgik\Entity\ExpenseClaim;
use Lodgik\Entity\ExpenseClaimItem;
use Lodgik\Entity\TrainingProgram;
use Lodgik\Entity\OffboardingChecklist;
use Lodgik\Helper\ResponseHelper;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Http\Message\{ResponseInterface as Response, ServerRequestInterface as Request};

final class HRController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ResponseHelper         $response,
    ) {}

    // ── Helpers ────────────────────────────────────────────────────────────
    private function pid(Request $r): string { return $r->getAttribute('auth.property_id') ?? ''; }
    private function tid(Request $r): string { return $r->getAttribute('auth.tenant_id') ?? ''; }
    private function uid(Request $r): string { return $r->getAttribute('auth.user_id') ?? ''; }
    private function body(Request $r): array { return (array)($r->getParsedBody() ?? []); }
    private function qs(Request $r): array   { return $r->getQueryParams(); }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE B — Documents
    // ════════════════════════════════════════════════════════════════════════

    public function listDocuments(Request $req, Response $res, array $args): Response
    {
        $docs = $this->em->getRepository(EmployeeDocument::class)
            ->findBy(['employeeId' => $args['id']], ['createdAt' => 'DESC']);
        return $this->response->success($res, array_map(fn($d) => $d->toArray(), $docs));
    }

    public function createDocument(Request $req, Response $res, array $args): Response
    {
        $body = $this->body($req);
        if (empty($body['title']) || empty($body['document_type']))
            return $this->response->validationError($res, ['title and document_type required']);
        $doc = new EmployeeDocument($args['id'], $body['title'], $body['document_type'], $this->tid($req));
        if (!empty($body['file_url']))   $doc->setFileUrl($body['file_url']);
        if (!empty($body['file_name']))  $doc->setFileName($body['file_name']);
        if (!empty($body['expiry_date'])) $doc->setExpiryDate(new \DateTimeImmutable($body['expiry_date']));
        if (!empty($body['notes']))      $doc->setNotes($body['notes']);
        $doc->setUploadedBy($this->uid($req));
        $this->em->persist($doc); $this->em->flush();
        return $this->response->created($res, $doc->toArray(), 'Document added');
    }

    public function deleteDocument(Request $req, Response $res, array $args): Response
    {
        $doc = $this->em->find(EmployeeDocument::class, $args['docId']);
        if (!$doc) return $this->response->notFound($res, 'Document not found');
        $this->em->remove($doc); $this->em->flush();
        return $this->response->success($res, null, 'Document deleted');
    }

    // ── Job History ────────────────────────────────────────────────────────

    public function listJobHistory(Request $req, Response $res, array $args): Response
    {
        $rows = $this->em->getRepository(EmployeeJobHistory::class)
            ->findBy(['employeeId' => $args['id']], ['startDate' => 'DESC']);
        return $this->response->success($res, array_map(fn($r) => $r->toArray(), $rows));
    }

    public function addJobHistory(Request $req, Response $res, array $args): Response
    {
        $body = $this->body($req);
        if (empty($body['job_title']) || empty($body['start_date']))
            return $this->response->validationError($res, ['job_title and start_date required']);
        $h = new EmployeeJobHistory($args['id'], $body['job_title'], new \DateTimeImmutable($body['start_date']), $this->tid($req), $body['change_type'] ?? 'promotion');
        if (!empty($body['department_name'])) $h->setDepartmentName($body['department_name']);
        if (!empty($body['department_id']))   $h->setDepartmentId($body['department_id']);
        if (!empty($body['end_date']))        $h->setEndDate(new \DateTimeImmutable($body['end_date']));
        if (!empty($body['change_reason']))   $h->setChangeReason($body['change_reason']);
        if (!empty($body['gross_salary']))    $h->setGrossSalary((string)(int)$body['gross_salary']);
        $h->setCreatedBy($this->uid($req));
        $this->em->persist($h); $this->em->flush();
        return $this->response->created($res, $h->toArray(), 'History recorded');
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE C — Recruitment
    // ════════════════════════════════════════════════════════════════════════

    public function listOpenings(Request $req, Response $res): Response
    {
        $qs = $this->qs($req);
        $qb = $this->em->createQueryBuilder()->select('j')->from(JobOpening::class,'j')
            ->where('j.propertyId = :pid')->setParameter('pid', $this->pid($req))
            ->orderBy('j.createdAt','DESC');
        if (!empty($qs['status'])) $qb->andWhere('j.status = :s')->setParameter('s',$qs['status']);
        $items = array_map(fn($j)=>$j->toArray(), $qb->getQuery()->getResult());
        return $this->response->success($res, $items);
    }

    public function createOpening(Request $req, Response $res): Response
    {
        $body = $this->body($req);
        if (empty($body['title'])) return $this->response->validationError($res, ['title required']);
        $j = new JobOpening($this->pid($req), $body['title'], $this->tid($req));
        foreach (['department_id','employment_type','description','requirements','vacancies','status'] as $f)
            if (isset($body[$f])) { $m='set'.str_replace('_','',ucwords($f,'_')); $j->$m($body[$f]); }
        if (!empty($body['salary_min'])) $j->setSalaryMin((string)((int)$body['salary_min']*100));
        if (!empty($body['salary_max'])) $j->setSalaryMax((string)((int)$body['salary_max']*100));
        if (!empty($body['deadline']))   $j->setDeadline(new \DateTimeImmutable($body['deadline']));
        $j->setPostedBy($this->uid($req));
        $this->em->persist($j); $this->em->flush();
        return $this->response->created($res, $j->toArray(), 'Job opening created');
    }

    public function updateOpening(Request $req, Response $res, array $args): Response
    {
        $j = $this->em->find(JobOpening::class, $args['id']);
        if (!$j) return $this->response->notFound($res, 'Opening not found');
        $body = $this->body($req);
        foreach (['title','description','requirements','status','employment_type'] as $f)
            if (isset($body[$f])) { $m='set'.str_replace('_','',ucwords($f,'_')); $j->$m($body[$f]); }
        if (isset($body['vacancies'])) $j->setVacancies((int)$body['vacancies']);
        if (isset($body['deadline']))  $j->setDeadline($body['deadline']?new \DateTimeImmutable($body['deadline']):null);
        $this->em->flush();
        return $this->response->success($res, $j->toArray(), 'Updated');
    }

    public function listApplications(Request $req, Response $res, array $args): Response
    {
        $qs = $this->qs($req);
        $qb = $this->em->createQueryBuilder()->select('a')->from(JobApplication::class,'a')
            ->where('a.jobOpeningId = :jid')->setParameter('jid',$args['id'])->orderBy('a.createdAt','DESC');
        if (!empty($qs['status'])) $qb->andWhere('a.status = :s')->setParameter('s',$qs['status']);
        return $this->response->success($res, array_map(fn($a)=>$a->toArray(),$qb->getQuery()->getResult()));
    }

    public function createApplication(Request $req, Response $res, array $args): Response
    {
        $body = $this->body($req);
        if (empty($body['applicant_name'])) return $this->response->validationError($res, ['applicant_name required']);
        $a = new JobApplication($args['id'], $body['applicant_name'], $this->tid($req));
        foreach (['applicant_email','applicant_phone','cv_url','cover_note','notes'] as $f)
            if (!empty($body[$f])) { $m='set'.str_replace('_','',ucwords($f,'_')); $a->$m($body[$f]); }
        $this->em->persist($a); $this->em->flush();
        return $this->response->created($res, $a->toArray(), 'Application created');
    }

    public function updateApplication(Request $req, Response $res, array $args): Response
    {
        $a = $this->em->find(JobApplication::class, $args['appId']);
        if (!$a) return $this->response->notFound($res, 'Application not found');
        $body = $this->body($req);
        if (!empty($body['status'])) $a->setStatus($body['status']);
        if (!empty($body['notes']))  $a->setNotes($body['notes']);
        if (!empty($body['rejection_reason'])) $a->setRejectionReason($body['rejection_reason']);
        if (!empty($body['interview_date'])) $a->setInterviewDate(new \DateTimeImmutable($body['interview_date']));
        if (!empty($body['offer_salary']))   $a->setOfferSalary((string)((int)$body['offer_salary']*100));
        $a->setReviewedBy($this->uid($req));
        $this->em->flush();
        return $this->response->success($res, $a->toArray(), 'Updated');
    }

    // ── Onboarding ─────────────────────────────────────────────────────────

    public function listOnboarding(Request $req, Response $res, array $args): Response
    {
        $items = $this->em->getRepository(OnboardingChecklist::class)
            ->findBy(['employeeId'=>$args['id']],['sortOrder'=>'ASC']);
        $done = count(array_filter($items, fn($i)=>$i->isCompleted()));
        return $this->response->success($res, [
            'items' => array_map(fn($i)=>$i->toArray(),$items),
            'total' => count($items), 'completed' => $done,
        ]);
    }

    public function addOnboardingTask(Request $req, Response $res, array $args): Response
    {
        $body = $this->body($req);
        if (empty($body['title'])) return $this->response->validationError($res, ['title required']);
        $t = new OnboardingChecklist($args['id'],$body['title'],$this->tid($req));
        if (!empty($body['category']))    $t->setCategory($body['category']);
        if (!empty($body['description'])) $t->setDescription($body['description']);
        if (!empty($body['due_date']))    $t->setDueDate(new \DateTimeImmutable($body['due_date']));
        if (!empty($body['assigned_to'])) $t->setAssignedTo($body['assigned_to']);
        if (isset($body['is_mandatory']))  $t->setIsMandatory((bool)$body['is_mandatory']);
        if (isset($body['sort_order']))    $t->setSortOrder((int)$body['sort_order']);
        $this->em->persist($t); $this->em->flush();
        return $this->response->created($res, $t->toArray(), 'Task added');
    }

    public function completeOnboardingTask(Request $req, Response $res, array $args): Response
    {
        $t = $this->em->find(OnboardingChecklist::class, $args['taskId']);
        if (!$t) return $this->response->notFound($res, 'Task not found');
        $t->complete($this->uid($req));
        $this->em->flush();
        return $this->response->success($res, $t->toArray(), 'Task completed');
    }

    public function seedDefaultOnboarding(Request $req, Response $res, array $args): Response
    {
        $defaults = [
            ['title'=>'Submit government-issued ID','category'=>'compliance','sort_order'=>1,'is_mandatory'=>true],
            ['title'=>'Provide bank account details','category'=>'payroll','sort_order'=>2,'is_mandatory'=>true],
            ['title'=>'Complete tax forms (TIN / PAYE)','category'=>'compliance','sort_order'=>3,'is_mandatory'=>true],
            ['title'=>'Sign employment contract','category'=>'documentation','sort_order'=>4,'is_mandatory'=>true],
            ['title'=>'Collect staff ID card','category'=>'access','sort_order'=>5,'is_mandatory'=>true],
            ['title'=>'IT access setup (email, PMS login)','category'=>'access','sort_order'=>6,'is_mandatory'=>true],
            ['title'=>'Complete property orientation tour','category'=>'general','sort_order'=>7,'is_mandatory'=>false],
            ['title'=>'Meet department head','category'=>'general','sort_order'=>8,'is_mandatory'=>false],
            ['title'=>'Review staff handbook','category'=>'policy','sort_order'=>9,'is_mandatory'=>true],
        ];
        $created = 0;
        foreach ($defaults as $d) {
            $t = new OnboardingChecklist($args['id'],$d['title'],$this->tid($req));
            $t->setCategory($d['category']);$t->setSortOrder($d['sort_order']);$t->setIsMandatory($d['is_mandatory']);
            $this->em->persist($t);$created++;
        }
        $this->em->flush();
        return $this->response->success($res, ['created'=>$created], 'Default onboarding tasks seeded');
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE F — Payroll Components
    // ════════════════════════════════════════════════════════════════════════

    public function listComponents(Request $req, Response $res): Response
    {
        $items = $this->em->getRepository(PayrollComponent::class)
            ->findBy(['tenantId'=>$this->tid($req)],['sortOrder'=>'ASC','componentType'=>'ASC']);
        return $this->response->success($res, array_map(fn($c)=>$c->toArray(),$items));
    }

    public function createComponent(Request $req, Response $res): Response
    {
        $body = $this->body($req);
        if (empty($body['name'])||empty($body['code'])||empty($body['component_type']))
            return $this->response->validationError($res,['name, code, component_type required']);
        $c = new PayrollComponent($body['name'],$body['code'],$body['component_type'],$this->tid($req));
        if (!empty($body['calculation'])) $c->setCalculation($body['calculation']);
        if (isset($body['value']))        $c->setValue((string)(int)$body['value']);
        if (isset($body['is_taxable']))   $c->setIsTaxable((bool)$body['is_taxable']);
        if (isset($body['sort_order']))   $c->setSortOrder((int)$body['sort_order']);
        $this->em->persist($c); $this->em->flush();
        return $this->response->created($res,$c->toArray(),'Component created');
    }

    public function updateComponent(Request $req, Response $res, array $args): Response
    {
        $c = $this->em->find(PayrollComponent::class,$args['id']);
        if (!$c) return $this->response->notFound($res,'Component not found');
        $body = $this->body($req);
        if (isset($body['name']))       $c->setName($body['name']);
        if (isset($body['value']))      $c->setValue((string)(int)$body['value']);
        if (isset($body['is_taxable'])) $c->setIsTaxable((bool)$body['is_taxable']);
        if (isset($body['is_active']))  $c->setIsActive((bool)$body['is_active']);
        if (isset($body['sort_order'])) $c->setSortOrder((int)$body['sort_order']);
        $this->em->flush();
        return $this->response->success($res,$c->toArray(),'Updated');
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE G — Performance Goals
    // ════════════════════════════════════════════════════════════════════════

    public function listGoals(Request $req, Response $res, array $args): Response
    {
        $qs = $this->qs($req);
        $qb = $this->em->createQueryBuilder()->select('g')->from(PerformanceGoal::class,'g')
            ->where('g.employeeId = :eid')->setParameter('eid',$args['id'])->orderBy('g.createdAt','DESC');
        if (!empty($qs['status'])) $qb->andWhere('g.status = :s')->setParameter('s',$qs['status']);
        return $this->response->success($res,array_map(fn($g)=>$g->toArray(),$qb->getQuery()->getResult()));
    }

    public function createGoal(Request $req, Response $res, array $args): Response
    {
        $body = $this->body($req);
        if (empty($body['title'])) return $this->response->validationError($res,['title required']);
        $g = new PerformanceGoal($args['id'],$body['title'],$this->tid($req));
        if (!empty($body['review_id']))    $g->setReviewId($body['review_id']);
        if (!empty($body['description']))  $g->setDescription($body['description']);
        if (!empty($body['category']))     $g->setCategory($body['category']);
        if (isset($body['weight']))        $g->setWeight((int)$body['weight']);
        if (!empty($body['target_value'])) $g->setTargetValue($body['target_value']);
        if (!empty($body['unit']))         $g->setUnit($body['unit']);
        if (!empty($body['due_date']))     $g->setDueDate(new \DateTimeImmutable($body['due_date']));
        $this->em->persist($g); $this->em->flush();
        return $this->response->created($res,$g->toArray(),'Goal created');
    }

    public function updateGoal(Request $req, Response $res, array $args): Response
    {
        $g = $this->em->find(PerformanceGoal::class,$args['goalId']);
        if (!$g) return $this->response->notFound($res,'Goal not found');
        $body = $this->body($req);
        foreach (['title','description','category','unit','status'] as $f)
            if (isset($body[$f])) { $m='set'.str_replace('_','',ucwords($f,'_')); $g->$m($body[$f]); }
        if (isset($body['weight']))       $g->setWeight((int)$body['weight']);
        if (isset($body['target_value'])) $g->setTargetValue($body['target_value']);
        if (isset($body['actual_value'])) $g->setActualValue($body['actual_value']);
        if (!empty($body['due_date']))    $g->setDueDate(new \DateTimeImmutable($body['due_date']));
        $this->em->flush();
        return $this->response->success($res,$g->toArray(),'Updated');
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE I — Expense Claims
    // ════════════════════════════════════════════════════════════════════════

    public function listClaims(Request $req, Response $res): Response
    {
        $qs = $this->qs($req);
        $qb = $this->em->createQueryBuilder()->select('c')->from(ExpenseClaim::class,'c')
            ->where('c.propertyId = :pid')->setParameter('pid',$this->pid($req))
            ->orderBy('c.createdAt','DESC');
        if (!empty($qs['status']))      $qb->andWhere('c.status = :s')->setParameter('s',$qs['status']);
        if (!empty($qs['employee_id'])) $qb->andWhere('c.employeeId = :e')->setParameter('e',$qs['employee_id']);
        $items = $qb->getQuery()->getResult();
        return $this->response->success($res,array_map(fn($c)=>$c->toArray(),$items));
    }

    public function getClaim(Request $req, Response $res, array $args): Response
    {
        $c = $this->em->find(ExpenseClaim::class,$args['id']);
        if (!$c) return $this->response->notFound($res,'Claim not found');
        $items = $this->em->getRepository(ExpenseClaimItem::class)->findBy(['claimId'=>$c->getId()]);
        $data = $c->toArray();
        $data['items'] = array_map(fn($i)=>$i->toArray(),$items);
        return $this->response->success($res,$data);
    }

    public function createClaim(Request $req, Response $res): Response
    {
        $body = $this->body($req);
        if (empty($body['employee_id'])||empty($body['title']))
            return $this->response->validationError($res,['employee_id and title required']);
        $emp = $this->em->find(Employee::class,$body['employee_id']);
        if (!$emp) return $this->response->notFound($res,'Employee not found');
        $c = new ExpenseClaim($this->pid($req),$emp->getId(),$emp->getFullName(),$body['title'],$this->tid($req));
        if (!empty($body['notes'])) $c->setNotes($body['notes']);
        // Add line items
        $total = 0;
        foreach ((array)($body['items']??[]) as $row) {
            $item = new ExpenseClaimItem($c->getId(),$row['description'],(string)((int)$row['amount']*100),new \DateTimeImmutable($row['expense_date']));
            if (!empty($row['category'])) $item->setCategory($row['category']);
            if (!empty($row['receipt_url'])) $item->setReceiptUrl($row['receipt_url']);
            $this->em->persist($item);
            $total += (int)$row['amount']*100;
        }
        $c->setTotalAmount((string)$total);
        $this->em->persist($c); $this->em->flush();
        return $this->response->created($res,$c->toArray(),'Claim created');
    }

    public function submitClaim(Request $req, Response $res, array $args): Response
    {
        $c = $this->em->find(ExpenseClaim::class,$args['id']);
        if (!$c) return $this->response->notFound($res,'Claim not found');
        $c->submit(); $this->em->flush();
        return $this->response->success($res,$c->toArray(),'Claim submitted');
    }

    public function approveClaim(Request $req, Response $res, array $args): Response
    {
        $c = $this->em->find(ExpenseClaim::class,$args['id']);
        if (!$c) return $this->response->notFound($res,'Claim not found');
        $c->approve($this->uid($req)); $this->em->flush();
        return $this->response->success($res,$c->toArray(),'Claim approved');
    }

    public function rejectClaim(Request $req, Response $res, array $args): Response
    {
        $c = $this->em->find(ExpenseClaim::class,$args['id']);
        if (!$c) return $this->response->notFound($res,'Claim not found');
        $body = $this->body($req);
        $c->reject($body['reason']??'No reason given'); $this->em->flush();
        return $this->response->success($res,$c->toArray(),'Claim rejected');
    }

    public function markClaimPaid(Request $req, Response $res, array $args): Response
    {
        $c = $this->em->find(ExpenseClaim::class,$args['id']);
        if (!$c) return $this->response->notFound($res,'Claim not found');
        $c->markPaid(); $this->em->flush();
        return $this->response->success($res,$c->toArray(),'Marked paid');
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE J — Training
    // ════════════════════════════════════════════════════════════════════════

    public function listTraining(Request $req, Response $res): Response
    {
        $qs = $this->qs($req);
        $qb = $this->em->createQueryBuilder()->select('t')->from(TrainingProgram::class,'t')
            ->where('t.propertyId = :pid')->setParameter('pid',$this->pid($req))->orderBy('t.createdAt','DESC');
        if (!empty($qs['status'])) $qb->andWhere('t.status = :s')->setParameter('s',$qs['status']);
        return $this->response->success($res,array_map(fn($t)=>$t->toArray(),$qb->getQuery()->getResult()));
    }

    public function createTraining(Request $req, Response $res): Response
    {
        $body = $this->body($req);
        if (empty($body['title'])) return $this->response->validationError($res,['title required']);
        $t = new TrainingProgram($this->pid($req),$body['title'],$this->tid($req));
        foreach (['category','mode','provider','description','status'] as $f)
            if (!empty($body[$f])) { $m='set'.str_replace('_','',ucwords($f,'_')); $t->$m($body[$f]); }
        if (!empty($body['duration_hours'])) $t->setDurationHours($body['duration_hours']);
        if (!empty($body['cost_per_head']))  $t->setCostPerHead((string)((int)$body['cost_per_head']*100));
        if (!empty($body['start_date']))     $t->setStartDate(new \DateTimeImmutable($body['start_date']));
        if (!empty($body['end_date']))       $t->setEndDate(new \DateTimeImmutable($body['end_date']));
        if (!empty($body['max_participants'])) $t->setMaxParticipants((int)$body['max_participants']);
        $this->em->persist($t); $this->em->flush();
        return $this->response->created($res,$t->toArray(),'Training program created');
    }

    public function updateTraining(Request $req, Response $res, array $args): Response
    {
        $t = $this->em->find(TrainingProgram::class,$args['id']);
        if (!$t) return $this->response->notFound($res,'Program not found');
        $body = $this->body($req);
        foreach (['title','category','mode','provider','description','status'] as $f)
            if (isset($body[$f])) { $m='set'.str_replace('_','',ucwords($f,'_')); $t->$m($body[$f]); }
        if (isset($body['start_date'])) $t->setStartDate($body['start_date']?new \DateTimeImmutable($body['start_date']):null);
        if (isset($body['end_date']))   $t->setEndDate($body['end_date']?new \DateTimeImmutable($body['end_date']):null);
        $this->em->flush();
        return $this->response->success($res,$t->toArray(),'Updated');
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE K — Offboarding
    // ════════════════════════════════════════════════════════════════════════

    public function listOffboarding(Request $req, Response $res, array $args): Response
    {
        $items = $this->em->getRepository(OffboardingChecklist::class)
            ->findBy(['employeeId'=>$args['id']],['sortOrder'=>'ASC']);
        $done = count(array_filter($items,fn($i)=>$i->isCompleted()));
        return $this->response->success($res,[
            'items'=>array_map(fn($i)=>$i->toArray(),$items),
            'total'=>count($items),'completed'=>$done,
        ]);
    }

    public function addOffboardingTask(Request $req, Response $res, array $args): Response
    {
        $body = $this->body($req);
        if (empty($body['title'])) return $this->response->validationError($res,['title required']);
        $t = new OffboardingChecklist($args['id'],$body['title'],$this->tid($req));
        if (!empty($body['category']))     $t->setCategory($body['category']);
        if (!empty($body['description']))  $t->setDescription($body['description']);
        if (!empty($body['assigned_to']))  $t->setAssignedTo($body['assigned_to']);
        if (!empty($body['assigned_name'])) $t->setAssignedName($body['assigned_name']);
        if (!empty($body['due_date']))     $t->setDueDate(new \DateTimeImmutable($body['due_date']));
        if (isset($body['is_mandatory']))  $t->setIsMandatory((bool)$body['is_mandatory']);
        if (isset($body['sort_order']))    $t->setSortOrder((int)$body['sort_order']);
        $this->em->persist($t); $this->em->flush();
        return $this->response->created($res,$t->toArray(),'Task added');
    }

    public function completeOffboardingTask(Request $req, Response $res, array $args): Response
    {
        $t = $this->em->find(OffboardingChecklist::class,$args['taskId']);
        if (!$t) return $this->response->notFound($res,'Task not found');
        $t->complete($this->uid($req)); $this->em->flush();
        return $this->response->success($res,$t->toArray(),'Task completed');
    }

    public function seedDefaultOffboarding(Request $req, Response $res, array $args): Response
    {
        $defaults = [
            ['title'=>'Return staff ID card & access badge','category'=>'access','sort_order'=>1,'mandatory'=>true],
            ['title'=>'Return uniform & equipment','category'=>'property','sort_order'=>2,'mandatory'=>true],
            ['title'=>'Handover all keys & keycards','category'=>'access','sort_order'=>3,'mandatory'=>true],
            ['title'=>'Complete knowledge transfer document','category'=>'documentation','sort_order'=>4,'mandatory'=>true],
            ['title'=>'Revoke system access (PMS, email, etc.)','category'=>'it','sort_order'=>5,'mandatory'=>true],
            ['title'=>'Final salary & outstanding dues settled','category'=>'payroll','sort_order'=>6,'mandatory'=>true],
            ['title'=>'Conduct exit interview','category'=>'hr','sort_order'=>7,'mandatory'=>false],
            ['title'=>'Issue relieving letter','category'=>'documentation','sort_order'=>8,'mandatory'=>false],
            ['title'=>'Collect feedback on tools & processes','category'=>'hr','sort_order'=>9,'mandatory'=>false],
        ];
        $created = 0;
        foreach ($defaults as $d) {
            $t = new OffboardingChecklist($args['id'],$d['title'],$this->tid($req));
            $t->setCategory($d['category']);$t->setSortOrder($d['sort_order']);$t->setIsMandatory($d['mandatory']);
            $this->em->persist($t);$created++;
        }
        $this->em->flush();
        return $this->response->success($res,['created'=>$created],'Default offboarding tasks seeded');
    }

    // ════════════════════════════════════════════════════════════════════════
    // PHASE L — HR Analytics
    // ════════════════════════════════════════════════════════════════════════

    public function analytics(Request $req, Response $res): Response
    {
        $pid = $this->pid($req);
        $tid = $this->tid($req);
        $conn = $this->em->getConnection();

        // Headcount by employment type
        $byType = $conn->fetchAllAssociative(
            "SELECT employment_type, COUNT(*) as count FROM employees
             WHERE property_id=? AND employment_status IN ('active','probation') AND deleted_at IS NULL
             GROUP BY employment_type",[$pid]);

        // Headcount by department
        $byDept = $conn->fetchAllAssociative(
            "SELECT d.name as department, COUNT(e.id) as count
             FROM employees e LEFT JOIN departments d ON e.department_id=d.id
             WHERE e.property_id=? AND e.employment_status IN ('active','probation') AND e.deleted_at IS NULL
             GROUP BY d.name ORDER BY count DESC",[$pid]);

        // Attendance rate last 30 days
        $attendance = $conn->fetchAllAssociative(
            "SELECT attendance_date::text as date,
                    COUNT(CASE WHEN status='present' THEN 1 END) as present,
                    COUNT(*) as total
             FROM attendance_records WHERE property_id=? AND attendance_date >= NOW()-INTERVAL '30 days'
             GROUP BY attendance_date ORDER BY attendance_date",[$pid]);

        // Leave distribution by type
        $leaveByType = $conn->fetchAllAssociative(
            "SELECT lt.name as leave_type, COUNT(lr.id) as count
             FROM leave_requests lr JOIN leave_types lt ON lr.leave_type_id=lt.id
             WHERE lr.tenant_id=? AND lr.status='approved' AND EXTRACT(YEAR FROM lr.start_date)=EXTRACT(YEAR FROM NOW())
             GROUP BY lt.name ORDER BY count DESC",[$tid]);

        // Monthly payroll cost (last 6 months)
        $payrollCost = $conn->fetchAllAssociative(
            "SELECT CONCAT(year,'-',LPAD(month::text,2,'0')) as month, total_gross, total_net
             FROM payroll_periods WHERE property_id=? AND status='paid'
             ORDER BY year DESC, month DESC LIMIT 6",[$pid]);

        // Pending expense claims
        $pendingClaims = $conn->fetchOne(
            "SELECT COUNT(*) FROM expense_claims WHERE property_id=? AND status='submitted'",[$pid]);

        // Contracts expiring in 30 days
        $expiringContracts = $conn->fetchOne(
            "SELECT COUNT(*) FROM employees WHERE property_id=?
             AND contract_end BETWEEN NOW() AND NOW()+INTERVAL '30 days'
             AND employment_status IN ('active','probation') AND deleted_at IS NULL",[$pid]);

        // Turnover rate (terminated this year / avg headcount)
        $terminated = $conn->fetchOne(
            "SELECT COUNT(*) FROM employees WHERE property_id=?
             AND employment_status IN ('terminated','resigned')
             AND EXTRACT(YEAR FROM termination_date)=EXTRACT(YEAR FROM NOW())",[$pid]);
        $total = $conn->fetchOne(
            "SELECT COUNT(*) FROM employees WHERE property_id=? AND deleted_at IS NULL",[$pid]);

        return $this->response->success($res,[
            'headcount_by_type'    => $byType,
            'headcount_by_dept'    => $byDept,
            'attendance_trend'     => $attendance,
            'leave_by_type'        => $leaveByType,
            'payroll_cost_trend'   => array_reverse($payrollCost),
            'pending_expense_claims' => (int)$pendingClaims,
            'expiring_contracts'   => (int)$expiringContracts,
            'total_employees'      => (int)$total,
            'terminated_this_year' => (int)$terminated,
            'turnover_rate_pct'    => $total > 0 ? round((int)$terminated / (int)$total * 100, 1) : 0,
        ]);
    }
}
