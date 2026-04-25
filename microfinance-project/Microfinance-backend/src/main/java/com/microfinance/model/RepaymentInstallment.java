package com.microfinance.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@Document(collection = "repayment_installments")
@CompoundIndexes({
    @CompoundIndex(name = "app_id_idx", def = "{'applicationId': 1}"),
    @CompoundIndex(name = "app_installment_idx", def = "{'applicationId': 1, 'installmentNumber': 1}"),
    @CompoundIndex(name = "status_archived_idx", def = "{'status': 1, 'archived': 1}"),
    @CompoundIndex(name = "due_date_status_idx", def = "{'dueDate': 1, 'status': 1}"),
    @CompoundIndex(name = "app_archived_installment_idx", def = "{'applicationId': 1, 'archived': 1, 'installmentNumber': 1}")
})
public class RepaymentInstallment {

    @Id
    private String id;

    private String applicationId;
    private String applicationNumber;

    private Integer installmentNumber;
    private LocalDate dueDate;

    private BigDecimal openingBalance = BigDecimal.ZERO;
    private BigDecimal principalPortion = BigDecimal.ZERO;
    private BigDecimal interestPortion = BigDecimal.ZERO;
    private BigDecimal installmentAmount = BigDecimal.ZERO;

    private BigDecimal paidAmount = BigDecimal.ZERO;
    private BigDecimal remainingAmount = BigDecimal.ZERO;
    private BigDecimal lateFee = BigDecimal.ZERO;

    private RepaymentStatus status = RepaymentStatus.PENDING;

    private boolean archived = false;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}