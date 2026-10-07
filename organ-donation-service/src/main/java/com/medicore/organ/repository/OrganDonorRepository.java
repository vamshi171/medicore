package com.medicore.organ.repository;

import com.medicore.organ.entity.BloodGroup;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.entity.OrganType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrganDonorRepository extends JpaRepository<OrganDonor, Long> {

    Optional<OrganDonor> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    Optional<OrganDonor> findByIdAndActiveTrue(Long id);

    long countByStatus(OrganDonor.Status status);

    long countByActiveTrue();

    /** How many usable pledges cover a given organ (dashboard breakdown). */
    @Query("""
            SELECT COUNT(DISTINCT d) FROM OrganDonor d JOIN d.organs o
            WHERE o = :organ AND d.active = true AND d.consentSigned = true
            """)
    long countUsablePledgesFor(@Param("organ") OrganType organ);

    /**
     * Every usable pledge for one organ: consent given and status VERIFIED or
     * ACTIVE. Blood-group suitability is decided in Java by the compatibility
     * engine, so the query only narrows by organ.
     */
    @Query("""
            SELECT DISTINCT d FROM OrganDonor d JOIN d.organs o
            WHERE d.active = true
              AND d.consentSigned = true
              AND d.status IN :statuses
              AND o = :organ
            ORDER BY d.id
            """)
    List<OrganDonor> findByOrganAndStatusIn(@Param("organ") OrganType organ,
                                            @Param("statuses") java.util.Collection<OrganDonor.Status> statuses);

    /** Convenience wrapper: the two statuses that count as committed. */
    default List<OrganDonor> findCommittedDonorsFor(OrganType organ) {
        return findByOrganAndStatusIn(organ, List.of(OrganDonor.Status.VERIFIED, OrganDonor.Status.ACTIVE));
    }

    @Query("""
            SELECT d FROM OrganDonor d
            WHERE d.active = true
              AND (:status IS NULL OR d.status = :status)
              AND (:bloodGroup IS NULL OR d.bloodGroup = :bloodGroup)
              AND (:city IS NULL OR LOWER(d.city) = LOWER(:city))
            ORDER BY d.status, d.fullName
            """)
    Page<OrganDonor> search(@Param("status") OrganDonor.Status status,
                            @Param("bloodGroup") BloodGroup bloodGroup,
                            @Param("city") String city,
                            Pageable pageable);
}
