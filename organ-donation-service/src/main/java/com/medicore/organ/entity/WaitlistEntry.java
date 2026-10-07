package com.medicore.organ.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

/**
 * A patient waiting for one specific organ.
 *
 * urgencyScore is the allocation priority (1 = stable, 10 = imminent risk) and
 * drives the ordering the coordinator sees. It is a plain field rather than a
 * computed one so a clinician can justify and override it.
 */
@Entity
@Table(name = "organ_waitlist",
        indexes = {
                @Index(name = "idx_waitlist_patient", columnList = "patient_user_id"),
                @Index(name = "idx_waitlist_organ_status", columnList = "organ_needed,status")
        })
public class WaitlistEntry {

    /** WAITING -> MATCHED -> TRANSPLANTED, with REMOVED as the unsupported terminal. */
    public enum Status { WAITING, MATCHED, TRANSPLANTED, REMOVED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "patient_user_id", nullable = false)
    private Long patientUserId;

    @Column(name = "patient_name", nullable = false, length = 100)
    private String patientName;

    @Enumerated(EnumType.STRING)
    @Column(name = "organ_needed", nullable = false, length = 20)
    private OrganType organNeeded;

    @Enumerated(EnumType.STRING)
    @Column(name = "blood_group", nullable = false, length = 12)
    private BloodGroup bloodGroup;

    @Column(name = "urgency_score", nullable = false)
    private int urgencyScore = 5;

    @Column(nullable = false, length = 120)
    private String hospital;

    @Column(nullable = false, length = 80)
    private String city;

    /** The clinician who listed the patient (DOCTOR or TRANSPLANT_COORDINATOR). */
    @Column(name = "referring_doctor_user_id")
    private Long referringDoctorUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status = Status.WAITING;

    @Column(name = "listed_at", nullable = false, updatable = false)
    private LocalDateTime listedAt;

    @Column(name = "matched_at")
    private LocalDateTime matchedAt;

    @Column(name = "transplanted_at")
    private LocalDateTime transplantedAt;

    @Column(length = 300)
    private String notes;

    @PrePersist
    void onCreate() {
        listedAt = LocalDateTime.now();
    }

    public boolean awaiting() {
        return status == Status.WAITING;
    }

    // --- getters / setters ---
    public Long getId() { return id; }
    public Long getPatientUserId() { return patientUserId; }
    public void setPatientUserId(Long patientUserId) { this.patientUserId = patientUserId; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public OrganType getOrganNeeded() { return organNeeded; }
    public void setOrganNeeded(OrganType organNeeded) { this.organNeeded = organNeeded; }
    public BloodGroup getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(BloodGroup bloodGroup) { this.bloodGroup = bloodGroup; }
    public int getUrgencyScore() { return urgencyScore; }
    public void setUrgencyScore(int urgencyScore) { this.urgencyScore = urgencyScore; }
    public String getHospital() { return hospital; }
    public void setHospital(String hospital) { this.hospital = hospital; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public Long getReferringDoctorUserId() { return referringDoctorUserId; }
    public void setReferringDoctorUserId(Long referringDoctorUserId) { this.referringDoctorUserId = referringDoctorUserId; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public LocalDateTime getListedAt() { return listedAt; }
    public LocalDateTime getMatchedAt() { return matchedAt; }
    public void setMatchedAt(LocalDateTime matchedAt) { this.matchedAt = matchedAt; }
    public LocalDateTime getTransplantedAt() { return transplantedAt; }
    public void setTransplantedAt(LocalDateTime transplantedAt) { this.transplantedAt = transplantedAt; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
