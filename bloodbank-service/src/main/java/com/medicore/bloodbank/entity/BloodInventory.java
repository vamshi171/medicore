package com.medicore.bloodbank.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * One stock lot: a quantity of a single component of a single group, held at a
 * centre, with one expiry date. Lots (not a single counter per group) are the
 * realistic model — blood is perishable, so "how much O+ do we have" is only
 * meaningful together with "and when does it go off".
 */
@Entity
@Table(name = "blood_inventory",
        uniqueConstraints = @UniqueConstraint(name = "uk_inventory_lot",
                columnNames = {"center_name", "blood_group", "component", "expiry_date"}),
        indexes = {
                @Index(name = "idx_inventory_group_component", columnList = "blood_group,component"),
                @Index(name = "idx_inventory_city", columnList = "city")
        })
public class BloodInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "center_name", nullable = false, length = 120)
    private String centerName;

    @Column(nullable = false, length = 80)
    private String city;

    @Enumerated(EnumType.STRING)
    @Column(name = "blood_group", nullable = false, length = 12)
    private BloodGroup bloodGroup;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BloodComponent component;

    @Column(name = "units_available", nullable = false)
    private int unitsAvailable;

    @Column(name = "units_reserved", nullable = false)
    private int unitsReserved;

    /** Below (and including) this figure the lot is flagged as critically low. */
    @Column(name = "critical_threshold", nullable = false)
    private int criticalThreshold = 3;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(length = 200)
    private String notes;

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

    // --- derived (not persisted: access type is FIELD, so these are plain methods) ---

    /** Units not already promised to an approved request. */
    public int availableUnits() {
        return Math.max(0, unitsAvailable - unitsReserved);
    }

    public boolean critical() {
        return availableUnits() <= criticalThreshold;
    }

    public boolean expired() {
        return expiryDate != null && expiryDate.isBefore(LocalDate.now());
    }

    public boolean expiringWithin(int days) {
        return expiryDate != null
                && !expired()
                && expiryDate.isBefore(LocalDate.now().plusDays(days));
    }

    // --- getters / setters ---
    public Long getId() { return id; }
    public String getCenterName() { return centerName; }
    public void setCenterName(String centerName) { this.centerName = centerName; }
    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }
    public BloodGroup getBloodGroup() { return bloodGroup; }
    public void setBloodGroup(BloodGroup bloodGroup) { this.bloodGroup = bloodGroup; }
    public BloodComponent getComponent() { return component; }
    public void setComponent(BloodComponent component) { this.component = component; }
    public int getUnitsAvailable() { return unitsAvailable; }
    public void setUnitsAvailable(int unitsAvailable) { this.unitsAvailable = unitsAvailable; }
    public int getUnitsReserved() { return unitsReserved; }
    public void setUnitsReserved(int unitsReserved) { this.unitsReserved = unitsReserved; }
    public int getCriticalThreshold() { return criticalThreshold; }
    public void setCriticalThreshold(int criticalThreshold) { this.criticalThreshold = criticalThreshold; }
    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
