package com.microfinance.service;

import com.microfinance.dto.DashboardAnalyticsResponse;
import com.microfinance.dto.ReportChartResponse;
import com.microfinance.dto.ReportFilterOptionsResponse;
import com.microfinance.dto.ReportTemplateRequest;
import com.microfinance.exception.ResourceNotFoundException;
import com.microfinance.model.Applicant;
import com.microfinance.model.LoanApplication;
import com.microfinance.model.LoanStatus;
import com.microfinance.model.RepaymentInstallment;
import com.microfinance.model.RepaymentStatus;
import com.microfinance.model.ReportDateRange;
import com.microfinance.model.ReportTemplate;
import com.microfinance.model.RiskAssessment;
import com.microfinance.repository.ApplicantRepository;
import com.microfinance.repository.LoanApplicationRepository;
import com.microfinance.repository.RepaymentInstallmentRepository;
import com.microfinance.repository.ReportTemplateRepository;
import com.microfinance.repository.RiskAssessmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportingService {

    private static final List<String> REPORT_TYPES = List.of("general", "defaults", "approvals", "repayment_performance");
    private static final List<String> ALLOWED_BRANCHES = List.of("All", "Colombo", "Kandy", "Kurunegala", "Matara", "Galle", "Jaffna", "Anuradhapura");
    private static final List<String> ALLOWED_STATUSES = List.of("All", "PENDING", "REVIEW", "APPROVED", "REJECTED", "CANCELLED");
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM yyyy", Locale.ENGLISH);

    private final LoanApplicationRepository loanApplicationRepository;
    private final ApplicantRepository applicantRepository;
    private final RiskAssessmentRepository riskAssessmentRepository;
    private final RepaymentInstallmentRepository repaymentInstallmentRepository;
    private final ReportTemplateRepository reportTemplateRepository;

    public DashboardAnalyticsResponse getDashboardAnalytics() {
        List<LoanApplication> applications = loanApplicationRepository.findAll();
        List<Applicant> applicants = applicantRepository.findAll();
        List<RiskAssessment> riskAssessments = riskAssessmentRepository.findAll();
        List<RepaymentInstallment> installments = repaymentInstallmentRepository.findAll();

        DashboardAnalyticsResponse response = new DashboardAnalyticsResponse();

        response.setTotalApplications(applications.size());
        response.setApprovedApplications(countByStatus(applications, LoanStatus.APPROVED));
        response.setRejectedApplications(countByStatus(applications, LoanStatus.REJECTED));
        response.setPendingApplications(countByStatus(applications, LoanStatus.PENDING));
        response.setReviewApplications(countByStatus(applications, LoanStatus.REVIEW));
        response.setTotalActiveLoans(response.getApprovedApplications());

        Map<String, RiskAssessment> latestRiskByApplication = latestNonDeletedRiskByApplication(riskAssessments);
        response.setAverageRiskScore(round(averageRiskScore(latestRiskByApplication.values())));

        List<RepaymentInstallment> activeInstallments = installments.stream()
                .filter(i -> !i.isArchived())
                .toList();

        response.setTotalInstallments(activeInstallments.size());

        List<RepaymentInstallment> overdue = activeInstallments.stream()
                .filter(i -> i.getStatus() == RepaymentStatus.OVERDUE)
                .toList();

        response.setOverdueInstallmentsCount(overdue.size());
        response.setTotalDefaultAmount(round(sumDefaultAmount(overdue)));

        response.setApplicationStatusBreakdown(countStatuses(applications.stream()
                .map(a -> a.getStatus() == null ? "UNKNOWN" : a.getStatus().name())
                .toList()));

        response.setRepaymentStatusBreakdown(countStatuses(activeInstallments.stream()
                .map(i -> i.getStatus() == null ? "UNKNOWN" : i.getStatus().name())
                .toList()));

        response.setRiskLevelBreakdown(countStatuses(latestRiskByApplication.values().stream()
                .map(r -> normalizeLabel(r.getRiskLevel(), "UNKNOWN"))
                .toList()));

        Map<YearMonth, Long> monthlyTrend = applications.stream()
                .filter(a -> a.getCreatedAt() != null)
                .collect(Collectors.groupingBy(a -> YearMonth.from(a.getCreatedAt().atZone(ZoneId.systemDefault())),
                        LinkedHashMap::new,
                        Collectors.counting()));

        List<YearMonth> sortedMonths = new ArrayList<>(monthlyTrend.keySet());
        sortedMonths.sort(Comparator.naturalOrder());

        response.setMonthlyApplicationTrendLabels(sortedMonths.stream()
                .map(m -> m.format(MONTH_LABEL))
                .toList());

        response.setMonthlyApplicationTrendValues(sortedMonths.stream()
                .map(monthlyTrend::get)
                .toList());

        return response;
    }

    // ═══════════════════════════════════════════════════════════
    // VALIDATION HELPERS
    // ═══════════════════════════════════════════════════════════

    private void validateReportType(String type) {
        String normalized = normalizeType(type);
        if (!REPORT_TYPES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid report type: " + type);
        }
    }

    private void validateBranch(String branch) {
        if (branch == null || "All".equalsIgnoreCase(branch.trim())) {
            return;
        }
        String normalized = branch.trim();
        if (!ALLOWED_BRANCHES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid branch: " + branch + ". Allowed values: " + String.join(", ", ALLOWED_BRANCHES));
        }
    }

    private void validateStatus(String status) {
        if (status == null || "All".equalsIgnoreCase(status.trim())) {
            return;
        }
        String normalized = status.trim().toUpperCase(Locale.ENGLISH);
        if (!ALLOWED_STATUSES.contains(normalized)) {
            throw new IllegalArgumentException("Invalid status: " + status + ". Allowed values: " + String.join(", ", ALLOWED_STATUSES));
        }
    }

    private void validateDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Start date cannot be after end date");
        }
    }

    private void validateTemplateRequest(ReportTemplateRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Template request is required");
        }

        String title = request.getTitle();
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }

        title = title.trim();
        if (title.length() < 3) {
            throw new IllegalArgumentException("Title must be at least 3 characters");
        }
        if (title.length() > 100) {
            throw new IllegalArgumentException("Title cannot exceed 100 characters");
        }

        if (request.getType() == null || request.getType().isBlank()) {
            throw new IllegalArgumentException("Type is required");
        }

        validateReportType(request.getType());

        // Validate filters
        if (request.getFilters() != null) {
            if (request.getFilters().getBranch() != null && !request.getFilters().getBranch().isBlank()) {
                validateBranch(request.getFilters().getBranch());
            }
            if (request.getFilters().getStatus() != null && !request.getFilters().getStatus().isBlank()) {
                validateStatus(request.getFilters().getStatus());
            }
            if (request.getFilters().getDateRange() != null) {
                ReportDateRange dateRange = request.getFilters().getDateRange();
                if (!dateRange.isValid()) {
                    throw new IllegalArgumentException(dateRange.getValidationMessage());
                }
            }
        }
    }

    private void validateTemplateId(String id) {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Template ID is required");
        }
    }

    public ReportChartResponse generateReport(String type, String branch, String status, LocalDate startDate, LocalDate endDate) {
        // Validate report type
        validateReportType(type);

        // Validate filter values
        validateBranch(branch);
        validateStatus(status);

        // Validate date range
        validateDateRange(startDate, endDate);

        log.debug("Generating report: type={}, branch={}, status={}, startDate={}, endDate={}", type, branch, status, startDate, endDate);

        String reportType = REPORT_TYPES.contains(normalizeType(type)) ? normalizeType(type) : "general";

        List<LoanApplication> applications = loanApplicationRepository.findAll();
        List<Applicant> applicants = applicantRepository.findAll();
        List<RiskAssessment> riskAssessments = riskAssessmentRepository.findAll();
        List<RepaymentInstallment> installments = repaymentInstallmentRepository.findAll();

        Map<String, Applicant> applicantById = applicants.stream()
                .collect(Collectors.toMap(Applicant::getId, Function.identity(), (a, b) -> a));

        List<LoanApplication> filteredApplications = filterApplications(applications, applicantById, branch, status, startDate, endDate);
        Set<String> appIds = filteredApplications.stream().map(LoanApplication::getId).collect(Collectors.toSet());

        Map<String, RiskAssessment> latestRiskByApplication = latestNonDeletedRiskByApplication(riskAssessments);

        List<RepaymentInstallment> activeInstallments = installments.stream()
                .filter(i -> !i.isArchived())
                .filter(i -> appIds.contains(i.getApplicationId()))
                .toList();

        ReportChartResponse response = new ReportChartResponse();
        response.setReportType(reportType);

        switch (reportType) {
            case "defaults" -> buildDefaultsReport(response, filteredApplications, activeInstallments);
            case "approvals" -> buildApprovalsReport(response, filteredApplications);
            case "repayment_performance" -> buildRepaymentPerformanceReport(response, filteredApplications, activeInstallments);
            default -> buildGeneralReport(response, filteredApplications, latestRiskByApplication, activeInstallments);
        }

        return response;
    }

    public List<ReportTemplate> getTemplates() {
        return reportTemplateRepository.findAllByOrderByCreatedAtDesc();
    }

    public ReportTemplate createTemplate(ReportTemplateRequest request) {
        validateTemplateRequest(request);

        ReportTemplate template = new ReportTemplate();
        template.setTitle(request.getTitle().trim());
        template.setType(normalizeType(request.getType()));

        // Set filters with normalized values
        if (request.getFilters() != null) {
            template.setFilters(request.getFilters());
            // Ensure branch defaults to "All" if not provided
            if (template.getFilters().getBranch() == null || template.getFilters().getBranch().isBlank()) {
                template.getFilters().setBranch("All");
            }
            // Ensure status defaults to "All" if not provided
            if (template.getFilters().getStatus() == null || template.getFilters().getStatus().isBlank()) {
                template.getFilters().setStatus("All");
            }
        }

        return reportTemplateRepository.save(template);
    }

    public ReportTemplate updateTemplate(String id, ReportTemplateRequest request) {
        validateTemplateId(id);
        validateTemplateRequest(request);

        ReportTemplate existing = reportTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report template not found: " + id));

        existing.setTitle(request.getTitle().trim());
        existing.setType(normalizeType(request.getType()));

        // Set filters with normalized values
        if (request.getFilters() != null) {
            existing.setFilters(request.getFilters());
            // Ensure branch defaults to "All" if not provided
            if (existing.getFilters().getBranch() == null || existing.getFilters().getBranch().isBlank()) {
                existing.getFilters().setBranch("All");
            }
            // Ensure status defaults to "All" if not provided
            if (existing.getFilters().getStatus() == null || existing.getFilters().getStatus().isBlank()) {
                existing.getFilters().setStatus("All");
            }
        }

        return reportTemplateRepository.save(existing);
    }

    public void deleteTemplates(List<String> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new IllegalArgumentException("At least one template ID is required");
        }

        // Validate no blank ids
        long blankCount = ids.stream().filter(id -> id == null || id.isBlank()).count();
        if (blankCount > 0) {
            throw new IllegalArgumentException("All template IDs must be non-empty strings");
        }

        List<ReportTemplate> existingTemplates = reportTemplateRepository.findAllById(ids);
        Set<String> foundIds = existingTemplates.stream().map(ReportTemplate::getId).collect(Collectors.toSet());
        List<String> missing = ids.stream().filter(id -> !foundIds.contains(id)).toList();

        if (!missing.isEmpty()) {
            throw new ResourceNotFoundException("Some template IDs were not found: " + String.join(", ", missing));
        }

        reportTemplateRepository.deleteAllById(ids);
    }

    public ReportFilterOptionsResponse getFilterOptions() {
        ReportFilterOptionsResponse response = new ReportFilterOptionsResponse();

        List<String> branches = applicantRepository.findAll().stream()
                .map(Applicant::getBranch)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(v -> !v.isEmpty())
                .distinct()
                .sorted(String::compareToIgnoreCase)
                .toList();

        List<String> statuses = loanApplicationRepository.findAll().stream()
                .map(LoanApplication::getStatus)
                .filter(Objects::nonNull)
                .map(Enum::name)
                .distinct()
                .sorted(String::compareToIgnoreCase)
                .toList();

        if (statuses.isEmpty()) {
            statuses = List.of(LoanStatus.PENDING.name(), LoanStatus.REVIEW.name(), LoanStatus.APPROVED.name(), LoanStatus.REJECTED.name(), LoanStatus.CANCELLED.name());
        }

        response.setBranches(branches);
        response.setStatuses(statuses);
        response.setReportTypes(REPORT_TYPES);
        return response;
    }

    private void buildDefaultsReport(ReportChartResponse response,
                                     List<LoanApplication> filteredApplications,
                                     List<RepaymentInstallment> activeInstallments) {
        Map<String, Long> overdueByMonth = activeInstallments.stream()
                .filter(i -> i.getStatus() == RepaymentStatus.OVERDUE)
                .filter(i -> i.getDueDate() != null)
                .collect(Collectors.groupingBy(i -> YearMonth.from(i.getDueDate()).format(MONTH_LABEL),
                        LinkedHashMap::new,
                        Collectors.counting()));

        if (overdueByMonth.isEmpty()) {
            overdueByMonth.put("No Data", 0L);
        }

        response.setLabels(new ArrayList<>(overdueByMonth.keySet()));
        response.setDatasets(List.of(dataset("Overdue Installments", overdueByMonth.values().stream().map(Long::doubleValue).toList(),
                "rgba(220, 38, 38, 0.7)", "rgba(220, 38, 38, 1)")));

        long overdueCount = activeInstallments.stream().filter(i -> i.getStatus() == RepaymentStatus.OVERDUE).count();
        double defaultAmount = sumDefaultAmount(activeInstallments.stream().filter(i -> i.getStatus() == RepaymentStatus.OVERDUE).toList());

        response.getKpis().put("totalApplicationsInScope", filteredApplications.size());
        response.getKpis().put("overdueInstallmentsCount", overdueCount);
        response.getKpis().put("totalDefaultAmount", round(defaultAmount));
        response.getKpis().put("activeInstallments", activeInstallments.size());
    }

    private void buildApprovalsReport(ReportChartResponse response, List<LoanApplication> filteredApplications) {
        Map<String, Long> statusBreakdown = countStatuses(filteredApplications.stream()
                .map(app -> app.getStatus() == null ? "UNKNOWN" : app.getStatus().name())
                .toList());

        if (statusBreakdown.isEmpty()) {
            statusBreakdown.put("NO_DATA", 0L);
        }

        response.setLabels(new ArrayList<>(statusBreakdown.keySet()));
        response.setDatasets(List.of(dataset("Applications", statusBreakdown.values().stream().map(Long::doubleValue).toList(),
                "rgba(19, 88, 255, 0.65)", "rgba(19, 88, 255, 1)")));

        response.getKpis().put("totalApplications", filteredApplications.size());
        response.getKpis().put("approvedApplications", countByStatus(filteredApplications, LoanStatus.APPROVED));
        response.getKpis().put("rejectedApplications", countByStatus(filteredApplications, LoanStatus.REJECTED));
        response.getKpis().put("pendingAndReview", countByStatus(filteredApplications, LoanStatus.PENDING) + countByStatus(filteredApplications, LoanStatus.REVIEW));
    }

    private void buildRepaymentPerformanceReport(ReportChartResponse response,
                                                 List<LoanApplication> filteredApplications,
                                                 List<RepaymentInstallment> activeInstallments) {
        Map<String, Long> repaymentBreakdown = countStatuses(activeInstallments.stream()
                .map(i -> i.getStatus() == null ? "UNKNOWN" : i.getStatus().name())
                .toList());

        if (repaymentBreakdown.isEmpty()) {
            repaymentBreakdown.put("NO_DATA", 0L);
        }

        response.setLabels(new ArrayList<>(repaymentBreakdown.keySet()));
        response.setDatasets(List.of(dataset("Repayment Performance", repaymentBreakdown.values().stream().map(Long::doubleValue).toList(),
                List.of(
                        "rgba(2, 195, 154, 0.75)",
                        "rgba(217, 119, 6, 0.75)",
                        "rgba(59, 130, 246, 0.75)",
                        "rgba(220, 38, 38, 0.75)",
                        "rgba(100, 116, 139, 0.75)"
                ))));

        response.getKpis().put("totalApplicationsInScope", filteredApplications.size());
        response.getKpis().put("totalInstallments", activeInstallments.size());
        response.getKpis().put("overdueInstallments", activeInstallments.stream().filter(i -> i.getStatus() == RepaymentStatus.OVERDUE).count());
        response.getKpis().put("paidInstallments", activeInstallments.stream().filter(i -> i.getStatus() == RepaymentStatus.PAID).count());
    }

    private void buildGeneralReport(ReportChartResponse response,
                                    List<LoanApplication> filteredApplications,
                                    Map<String, RiskAssessment> latestRiskByApplication,
                                    List<RepaymentInstallment> activeInstallments) {
        Map<String, Long> appStatusBreakdown = countStatuses(filteredApplications.stream()
                .map(app -> app.getStatus() == null ? "UNKNOWN" : app.getStatus().name())
                .toList());

        if (appStatusBreakdown.isEmpty()) {
            appStatusBreakdown.put("NO_DATA", 0L);
        }

        response.setLabels(new ArrayList<>(appStatusBreakdown.keySet()));
        response.setDatasets(List.of(dataset("Applications", appStatusBreakdown.values().stream().map(Long::doubleValue).toList(),
                List.of(
                        "rgba(19, 88, 255, 0.75)",
                        "rgba(217, 119, 6, 0.75)",
                        "rgba(2, 195, 154, 0.75)",
                        "rgba(220, 38, 38, 0.75)",
                        "rgba(124, 58, 237, 0.75)"
                ))));

        Collection<RiskAssessment> inScopeRisks = latestRiskByApplication.values().stream()
                .filter(r -> filteredApplications.stream().anyMatch(app -> Objects.equals(app.getId(), r.getApplicationId())))
                .toList();

        response.getKpis().put("totalApplications", filteredApplications.size());
        response.getKpis().put("approvedApplications", countByStatus(filteredApplications, LoanStatus.APPROVED));
        response.getKpis().put("overdueInstallments", activeInstallments.stream().filter(i -> i.getStatus() == RepaymentStatus.OVERDUE).count());
        response.getKpis().put("averageRiskScore", round(averageRiskScore(inScopeRisks)));
    }

    private List<LoanApplication> filterApplications(List<LoanApplication> applications,
                                                     Map<String, Applicant> applicantById,
                                                     String branch,
                                                     String status,
                                                     LocalDate startDate,
                                                     LocalDate endDate) {
        // Normalize branch and status (defaults to "All" if null/blank)
        // "All" means no filtering on that dimension
        String normalizedBranch = branch == null || branch.isBlank() ? "All" : branch.trim();
        String normalizedStatus = status == null || status.isBlank() ? "All" : status.trim().toUpperCase(Locale.ENGLISH);

        log.debug("Filtering applications: normalizedBranch={}, normalizedStatus={}", normalizedBranch, normalizedStatus);

        return applications.stream()
                .filter(app -> {
                    // If branch is "All", include all branches
                    if ("All".equalsIgnoreCase(normalizedBranch)) {
                        return true;
                    }
                    // Otherwise, match applicant's branch
                    Applicant applicant = applicantById.get(app.getApplicantId());
                    String appBranch = applicant == null ? "" : applicant.getBranch();
                    return normalizedBranch.equals(appBranch);
                })
                .filter(app -> {
                    // If status is "All", include all statuses
                    if ("All".equalsIgnoreCase(normalizedStatus)) {
                        return true;
                    }
                    // Otherwise, match application status
                    return app.getStatus() != null && normalizedStatus.equals(app.getStatus().name());
                })
                .filter(app -> inDateRange(app.getCreatedAt(), startDate, endDate))
                .toList();
    }

    private boolean inDateRange(Instant createdAt, LocalDate startDate, LocalDate endDate) {
        if (createdAt == null) {
            return startDate == null && endDate == null;
        }

        LocalDate createdDate = createdAt.atZone(ZoneId.systemDefault()).toLocalDate();
        if (startDate != null && createdDate.isBefore(startDate)) {
            return false;
        }
        return endDate == null || !createdDate.isAfter(endDate);
    }

    private long countByStatus(List<LoanApplication> applications, LoanStatus status) {
        return applications.stream().filter(a -> a.getStatus() == status).count();
    }

    private Map<String, Long> countStatuses(List<String> values) {
        Map<String, Long> grouped = values.stream()
                .collect(Collectors.groupingBy(v -> normalizeLabel(v, "UNKNOWN"), LinkedHashMap::new, Collectors.counting()));

        return grouped.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
    }

    private Map<String, RiskAssessment> latestNonDeletedRiskByApplication(List<RiskAssessment> riskAssessments) {
        return riskAssessments.stream()
                .filter(r -> !Boolean.TRUE.equals(r.getDeleted()))
                .filter(r -> r.getApplicationId() != null)
                .collect(Collectors.toMap(
                        RiskAssessment::getApplicationId,
                        Function.identity(),
                        (left, right) -> toComparableTime(right).isAfter(toComparableTime(left)) ? right : left
                ));
    }

    private Instant toComparableTime(RiskAssessment assessment) {
        if (assessment.getAssessedAt() != null) {
            return assessment.getAssessedAt();
        }
        if (assessment.getCreatedAt() != null) {
            return assessment.getCreatedAt();
        }
        return Instant.EPOCH;
    }

    private double averageRiskScore(Collection<RiskAssessment> assessments) {
        return assessments.stream()
                .map(RiskAssessment::getRiskScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    private double sumDefaultAmount(List<RepaymentInstallment> overdueInstallments) {
        BigDecimal total = overdueInstallments.stream()
                .map(i -> safe(i.getRemainingAmount()).add(safe(i.getLateFee())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.doubleValue();
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private Map<String, Object> dataset(String label, List<Double> data, String backgroundColor, String borderColor) {
        Map<String, Object> dataset = new LinkedHashMap<>();
        dataset.put("label", label);
        dataset.put("data", data);
        dataset.put("backgroundColor", backgroundColor);
        dataset.put("borderColor", borderColor);
        dataset.put("borderWidth", 1);
        return dataset;
    }

    private Map<String, Object> dataset(String label, List<Double> data, List<String> backgroundColors) {
        Map<String, Object> dataset = new LinkedHashMap<>();
        dataset.put("label", label);
        dataset.put("data", data);
        dataset.put("backgroundColor", backgroundColors.subList(0, Math.min(backgroundColors.size(), Math.max(data.size(), 1))));
        dataset.put("borderWidth", 1);
        return dataset;
    }

    private String normalizeFilter(String value) {
        if (value == null || value.isBlank()) {
            return "ALL";
        }
        return value.trim().toUpperCase(Locale.ENGLISH);
    }

    private String normalizeType(String value) {
        if (value == null || value.isBlank()) {
            return "general";
        }
        return value.trim().toLowerCase(Locale.ENGLISH);
    }

    private String normalizeLabel(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim().toUpperCase(Locale.ENGLISH);
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
