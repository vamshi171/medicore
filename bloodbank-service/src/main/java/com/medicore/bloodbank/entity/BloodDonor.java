package com.medicore.bloodbank.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * A registered blood donor. One row per auth user (userId is the unique key),
 * so the registry is a 1:1 extension of an identity rather than a duplicate
 * user table.
 */
@Entity
@Table(name = "blood_donors",
        indexes = {
                @Index(name = "idx_donors_user_id", columnList = "user_id", unique = true),
                @Index(name = "idx_donors_group_city", columnList = "blood_group,city")
        })
public class BloodDonor {

    /** Whole-blood donors must wait ~90 days between donations. */
    public static final int MIN_DAYS_BETWEEN_DONATIONS = 90;

    public enum Eligibility { ELIGIBLE, DEFERRED }

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

    @Column(name = "weight_kg", nullable = false)
    private int weightKg;

    @Column(length = 15)
    private String phone;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(name = "last_donation_date")
    private LocalDate lastDonationDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 12)
    private Eligibility eligibility = Eligibility.ELIGIBLE;

    @Column(name = "deferral_reason", length = 200)
    private String deferralReason;

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

    // --- derived (plain methods: Hibernate uses FIELD access here) ---

    /** Date this donor becomes eligible again (null when they never donated here). */
    public LocalDate nextEligibleDate() {
        if (lastDonationDate == null) {
            return null;
        }
        return lastDonationDate.plusDays(MIN_DAYS_BETWEEN_DONATIONS);
    }

    /** Donor flagged ELIGIBLE *and* past the cool-down window. */
    public boolean eligibleNow() {
        if (eligibility != Eligibility.ELIGIBLE) {
            return false;
        }
        LocalDate next = nextEligibleDate();
        return next == null || !next.isAfter(LocalDate.now());
    }

    public long daysUntilEligible() {
        LocalDate next = nextEligibleDate();
        if (next == null) {
            return 0;
        }
        long days = ChronoUnit.DAYS.between(LocalDate.now(), next);
        return Math.max(0, days);
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
    public int getWeightKg() { return weightKg; }
    public void setWeightKg(int weightKg) { this.weightKg = weightKg; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public LocalDate getLastDonationDate() { return lastDonationDate; }
    public void setLastDonationDate(LocalDate lastDonationDate) { this.lastDonationDate = lastDonationDate; }
    public Eligibility getEligibility() { return eligibility; }
    public void setEligibility(Eligibility eligibility) { this.eligibility = eligibility; }
    public String getDeferralReason() { return deferralReason; }
    public void setDeferralReason(String deferralReason) { this.deferralReason = deferralReason; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
