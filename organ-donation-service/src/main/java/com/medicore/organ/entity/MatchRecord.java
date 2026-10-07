package com.medicore.organ.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * An allocation: one donor's pledged organ offered to one waiting patient.
 *
 * Like appointment-service, this entity denormalises the participants' names
 * alongside their ids. That is deliberate: an allocation is a permanent record
 * of who was matched, and it must stay readable even if a profile is later
 * renamed or deactivated.
 */
@Entity
@Table(name = "organ_matches",
        indexes = {
                @Index(name = "idx_matches_status", columnList = "status"),
                @Index(name = "idx_matches_organ", columnList = "organ"),
                @Index(name = "idx_matches_donor_user", columnList = "donor_user_id"),
                @Index(name = "idx_matches_recipient_user", columnList = "recipient_user_id")
        })
public class MatchRecord {

    /** PROPOSED -> CONFIRMED -> COMPLETED, with WITHDRAWN as the terminal failure. */
    public enum Status { PROPOSED, CONFIRMED, COMPLETED, WITHDRAWN }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "donor_id", nullable = false)
    private Long donorId;

    @Column(name = "donor_user_id", nullable = false)
    private Long donorUserId;

    @Column(name = "donor_name", nullable = false, length = 100)
    private String donorName;

    @Column(name = "recipient_id", nullable = false)
    private Long recipientId;

    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;

    @Column(name = "recipient_name", nullable = false, length = 100)
    private String recipientName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrganType organ;

    /** How well the pair matched — kept so an allocation can be justified later. */
    @Column(name = "compatibility_tier", nullable = false, length = 24)
    private String compatibilityTier;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.PROPOSED;

    @Column(name = "proposed_by_user_id", nullable = false)
    private Long proposedByUserId;

    @Column(name = "proposed_at", nullable = false, updatable = false)
    private LocalDateTime proposedAt;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(length = 300)
    private String notes;

    @PrePersist
    void onCreate() {
        proposedAt = LocalDateTime.now();
    }

    // --- getters / setters ---
    public Long getId() { return id; }
    public Long getDonorId() { return donorId; }
    public void setDonorId(Long donorId) { this.donorId = donorId; }
    public Long getDonorUserId() { return donorUserId; }
    public void setDonorUserId(Long donorUserId) { this.donorUserId = donorUserId; }
    public String getDonorName() { return donorName; }
    public void setDonorName(String donorName) { this.donorName = donorName; }
    public Long getRecipientId() { return recipientId; }
    public void setRecipientId(Long recipientId) { this.recipientId = recipientId; }
    public Long getRecipientUserId() { return recipientUserId; }
    public void setRecipientUserId(Long recipientUserId) { this.recipientUserId = recipientUserId; }
    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }
    public OrganType getOrgan() { return organ; }
    public void setOrgan(OrganType organ) { this.organ = organ; }
    public String getCompatibilityTier() { return compatibilityTier; }
    public void setCompatibilityTier(String compatibilityTier) { this.compatibilityTier = compatibilityTier; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Long getProposedByUserId() { return proposedByUserId; }
    public void setProposedByUserId(Long proposedByUserId) { this.proposedByUserId = proposedByUserId; }
    public LocalDateTime getProposedAt() { return proposedAt; }
    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
