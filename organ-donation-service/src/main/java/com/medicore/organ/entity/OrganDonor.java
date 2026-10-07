package com.medicore.organ.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * A donor pledge — the opt-in record behind a person's decision to donate.
 *
 * Organs are modelled as an {@code @ElementCollection} (a join table of small
 * enum values) rather than a comma-separated column: it keeps "find every
 * kidney donor" a real indexed query instead of a LIKE scan, and it lets the
 * pledge set change without a schema change.
 */
@Entity
@Table(name = "organ_donors",
        indexes = {
                @Index(name = "idx_organ_donors_user_id", columnList = "user_id", unique = true),
                @Index(name = "idx_organ_donors_status", columnList = "status"),
                @Index(name = "idx_organ_donors_group", columnList = "blood_group")
        })
public class OrganDonor {

    /** PENDING -> VERIFIED -> ACTIVE, with REVOKED as the withdrawal terminal. */
    public enum Status { PENDING, VERIFIED, ACTIVE, REVOKED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "blood_group", nullable = false, length = 12)
    private BloodGroup bloodGroup;

    @Column(nullable = false)
    private int age;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(length = 15)
    private String phone;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "organ_donor_organs",
            joinColumns = @JoinColumn(name = "donor_id"),
            uniqueConstraints = @UniqueConstraint(name = "uk_donor_organ",
                    columnNames = {"donor_id", "organ_type"}))
    @Enumerated(EnumType.STRING)
    @Column(name = "organ_type", nullable = false, length = 20)
    private Set<OrganType> organs = new LinkedHashSet<>();

    @Column(name = "consent_signed", nullable = false)
    private boolean consentSigned;

    @Column(name = "consent_signed_at")
    private LocalDateTime consentSignedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Status status = Status.PENDING;

    @Column(name = "verified_by_user_id")
    private Long verifiedByUserId;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "medical_notes", length = 300)
    private String medicalNotes;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // --- derived (plain methods: Hibernate uses FIELD access on this entity) ---

    /** Consent given and not withdrawn — the only pledges an allocation may use. */
    public boolean committed() {
        return consentSigned
                && status != Status.REVOKED
                && (status == Status.VERIFIED || status == Status.ACTIVE);
    }

    public boolean pledges(OrganType organ) {
        return organs != null && organs.contains(organ);
    }

    // --- getters / setters ---
    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public BloodGroup getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(BloodGroup bloodGroup) { this.bloodGroup = bloodGroup; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public Set<OrganType> getOrgans() { return organs; }
    public void setOrgans(Set<OrganType> organs) { this.organs = organs; }
    public boolean isConsentSigned() { return consentSigned; }
    public void setConsentSigned(boolean consentSigned) { this.consentSigned = consentSigned; }
    public LocalDateTime getConsentSignedAt() { return consentSignedAt; }
    public void setConsentSignedAt(LocalDateTime consentSignedAt) { this.consentSignedAt = consentSignedAt; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Long getVerifiedByUserId() { return verifiedByUserId; }
    public void setVerifiedByUserId(Long verifiedByUserId) { this.verifiedByUserId = verifiedByUserId; }
    public LocalDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }
    public String getMedicalNotes() { return medicalNotes; }
    public void setMedicalNotes(String medicalNotes) { this.medicalNotes = medicalNotes; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
