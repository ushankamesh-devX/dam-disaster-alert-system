package com.ddas.api.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "dam_gates")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DamGate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "dam_id", nullable = false)
    private Dam dam;

    @Column(name = "gate_number", nullable = false, length = 20)
    private String gateNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "gate_type", nullable = false)
    private GateType gateType;

    @Column(name = "latitude", precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "max_opening_meters", precision = 6, scale = 2)
    private BigDecimal maxOpeningMeters;

    @Column(name = "current_opening_meters", precision = 6, scale = 2)
    private BigDecimal currentOpeningMeters = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GateStatus status = GateStatus.closed;

    @Column(name = "last_operation_at")
    private LocalDateTime lastOperationAt;

    @Column(name = "operated_by")
    private Long operatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum GateType {
        radial, vertical, drum, flap, sluice
    }

    public enum GateStatus {
        closed, partial, fully_open, maintenance, jammed
    }
}
