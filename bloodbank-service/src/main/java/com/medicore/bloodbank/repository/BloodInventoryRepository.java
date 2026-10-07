package com.medicore.bloodbank.repository;

import com.medicore.bloodbank.entity.BloodComponent;
import com.medicore.bloodbank.entity.BloodGroup;
import com.medicore.bloodbank.entity.BloodInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BloodInventoryRepository extends JpaRepository<BloodInventory, Long> {

    Optional<BloodInventory> findByIdAndActiveTrue(Long id);

    /** Natural key of a stock lot — used for idempotent seeding. */
    boolean existsByCenterNameAndBloodGroupAndComponentAndExpiryDate(
            String centerName, BloodGroup bloodGroup, BloodComponent component, LocalDate expiryDate);

    /**
     * All-optional search over usable stock (active, not past its expiry date).
     * Written as JPQL so the three filters compose without four derived queries.
     */
    @Query("""
            SELECT i FROM BloodInventory i
            WHERE i.active = true
              AND i.expiryDate >= :today
              AND (:bloodGroup IS NULL OR i.bloodGroup = :bloodGroup)
              AND (:component IS NULL OR i.component = :component)
              AND (:city IS NULL OR LOWER(i.city) = LOWER(:city))
            ORDER BY i.bloodGroup, i.expiryDate
            """)
    List<BloodInventory> search(@Param("bloodGroup") BloodGroup bloodGroup,
                               @Param("component") BloodComponent component,
                               @Param("city") String city,
                               @Param("today") LocalDate today);

    /** Lots at or near expiry, soonest first — the daily "use or discard" worklist. */
    List<BloodInventory> findByActiveTrueAndExpiryDateBeforeOrderByExpiryDateAsc(LocalDate cutoff);

    /**
     * FIFO issue candidates for one group + component: oldest expiry first, so
     * the blood that will spoil soonest is used first.
     */
    @Query("""
            SELECT i FROM BloodInventory i
            WHERE i.active = true
              AND i.expiryDate >= :today
              AND i.bloodGroup = :bloodGroup
              AND i.component = :component
              AND (i.unitsAvailable - i.unitsReserved) > 0
            ORDER BY i.expiryDate ASC, i.id ASC
            """)
    List<BloodInventory> findIssueCandidates(@Param("bloodGroup") BloodGroup bloodGroup,
                                            @Param("component") BloodComponent component,
                                            @Param("today") LocalDate today);

    long countByActiveTrue();

    /** Every active lot — used for the dashboard aggregates. */
    List<BloodInventory> findByActiveTrue();

    @Query("SELECT COALESCE(SUM(i.unitsAvailable - i.unitsReserved), 0) FROM BloodInventory i "
            + "WHERE i.active = true AND i.expiryDate >= :today")
    long sumUsableUnits(@Param("today") LocalDate today);
}
