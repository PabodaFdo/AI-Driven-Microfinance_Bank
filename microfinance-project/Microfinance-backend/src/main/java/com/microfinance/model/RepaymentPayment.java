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
@Document(collection = "repayment_payments")
@CompoundIndexes({
    @CompoundIndex(name = "payment_app_idx", def = "{'applicationId': 1}"),
    @CompoundIndex(name = "payment_app_installment_idx", def = "{'applicationId': 1, 'installmentNumber': 1}"),
    @CompoundIndex(name = "payment_status_active_idx", def = "{'status': 1, 'active': 1}")
})
public class RepaymentPayment {

    @Id
    private String id;

    private String paymentReference;

    private String applicationId;
    private String applicationNumber;
    private Integer installmentNumber;

    private BigDecimal amountPaid = BigDecimal.ZERO;
    private BigDecimal lateFeePaid = BigDecimal.ZERO;

    private LocalDate paymentDate;
    private String recordedBy;
    private String notes;

    // New audit-safe fields
    private PaymentRecordStatus status = PaymentRecordStatus.RECORDED;
    private boolean active = true;

    private Instant voidedAt;
    private String voidedBy;
    private String voidReason;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}