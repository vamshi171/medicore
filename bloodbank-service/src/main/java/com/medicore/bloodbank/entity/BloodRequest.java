package com.medicore.bloodbank.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * A clinician asking the blood bank for units. Carries the requester's auth
 * userId, which is the ownership boundary: a patient may only read and cancel
 * their own requests, while staff see the whole board.
 */
@Entity
@Table(name = "blood_requests",
        indexes = {
                @Index(name = "idx_requests_requester", columnList = "requester_user_id"),
                @Index(name = "idx_requests_status", columnList = "status")
        })
public class BloodRequest {

    public enum Urgency { ROUTINE, URGENT, CRITICAL }

    /** REQUESTED -> APPROVED -> FULFILLED, with REJECTED / CANCELLED as terminals. */
    public enum Status { REQUESTED, APPROVED, FULFILLED, REJECTED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "requester_user_id", nullable = false)
    private Long requesterUserId;

    @Column(name = "requester_name", nullable = false, length = 120)
    private String requesterName;

    /** Role at the time of asking — kept for the audit trail. */
    @Column(name = "requester_role", nullable = false, length = 40)
    private String requesterRole;

    @Column(name = "patient_name", nullable = false, length = 100)
    private String patientName;

    @Enumerated(EnumType.STRING)
    @Column(name = "blood_group", nullable = false, length = 12)
    private BloodGroup bloodGroup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BloodComponent component;

    @Column(name = "units_needed", nullable = false)
    private int unitsNeeded;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Urgency urgency = Urgency.ROUTINE;

    @Column(nullable = false, length = 120)
    private String hospital;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(length = 300)
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.REQUESTED;

    @Column(name = "decided_by_user_id")
    private Long decidedByUserId;

    @Column(name = "decision_note", length = 300)
    private String decisionNote;

    /** Centre(s) the units were drawn from, filled in on fulfilment. */
    @Column(name = "fulfilled_from", length = 300)
    private String fulfilledFrom;

    @Column(name = "requested_at", nullable = false, updatable = false)
    private LocalDateTime requestedAt;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "fulfilled_at")
    private LocalDateTime fulfilledAt;

    @PrePersist
    void onCreate() {
        requestedAt = LocalDateTime.now();
    }

    // --- getters / setters ---
    public Long getId() { return id; }
    public Long getRequesterUserId() { return requesterUserId; }
    public void setRequesterUserId(Long requesterUserId) { this.requesterUserId = requesterUserId; }
    public String getRequesterName() { return requesterName; }
    public void setRequesterName(String requesterName) { this.requesterName = requesterName; }
    public String getRequesterRole() { return requesterRole; }
    public void setRequesterRole(String requesterRole) { this.requesterRole = requesterRole; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public BloodGroup getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(BloodGroup bloodGroup) { this.bloodGroup = bloodGroup; }
    public BloodComponent getComponent() { return component; }
    public void setComponent(BloodComponent component) { this.component = component; }
    public int getUnitsNeeded() { return unitsNeeded; }
    public void setUnitsNeeded(int unitsNeeded) { this.unitsNeeded = unitsNeeded; }
    public Urgency getUrgency() { return urgency; }
    public void setUrgency(Urgency urgency) { this.urgency = urgency; }
    public String getHospital() { return hospital; }
    public void setHospital(String hospital) { this.hospital = hospital; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Long getDecidedByUserId() { return decidedByUserId; }
    public void setDecidedByUserId(Long decidedByUserId) { this.decidedByUserId = decidedByUserId; }
    public String getDecisionNote() { return decisionNote; }
    public void setDecisionNote(String decisionNote) { this.decisionNote = decisionNote; }
    public String getFulfilledFrom() { return fulfilledFrom; }
    public void setFulfilledFrom(String fulfilledFrom) { this.fulfilledFrom = fulfilledFrom; }
    public LocalDateTime getRequestedAt() { return requestedAt; }
    public LocalDateTime getDecidedAt() { return decidedAt; }
    public void setDecidedAt(LocalDateTime decidedAt) { this.decidedAt = decidedAt; }
    public LocalDateTime getFulfilledAt() { return fulfilledAt; }
    public void setFulfilledAt(LocalDateTime fulfilledAt) { this.fulfilledAt = fulfilledAt; }
}
