package com.medicore.auth.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Application user. Deactivation is a soft delete: rows are never removed —
 * healthcare data retention/compliance — instead active=false + deactivatedAt.
 */
@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_users_email", columnList = "email", unique = true)
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 120)
    private String email;

    @Column(nullable = false)
    private String password; // BCrypt hash — never the raw password

    /**
     * Stored as a VARCHAR rather than the database's native ENUM type.
     *
     * Hibernate 6 maps STRING enums to MySQL ENUM when the dialect allows it,
     * and Hibernate's `ddl-auto: update` cannot widen an ENUM's value list. That
     * made adding a role a silent startup failure ("Data truncated for column
     * 'role'") on any database created before the new value existed. An
     * explicit VARCHAR(40) keeps the identity table's most important column
     * future-proof and portable across databases.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40, columnDefinition = "varchar(40)")
    private Role role;

    @Column(nullable = false)
    private boolean active = true;

    private LocalDateTime deactivatedAt;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

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

    // --- getters / setters ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public LocalDateTime getDeactivatedAt() { return deactivatedAt; }
    public void setDeactivatedAt(LocalDateTime deactivatedAt) { this.deactivatedAt = deactivatedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
