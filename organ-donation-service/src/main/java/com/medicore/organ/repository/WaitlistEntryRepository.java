package com.medicore.organ.repository;

import com.medicore.organ.entity.OrganType;
import com.medicore.organ.entity.WaitlistEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WaitlistEntryRepository extends JpaRepository<WaitlistEntry, Long> {

    List<WaitlistEntry> findByPatientUserIdOrderByListedAtDesc(Long patientUserId);

    /** Highest urgency first, then longest waiting. */
    List<WaitlistEntry> findByStatusAndOrganNeededOrderByUrgencyScoreDescListedAtAsc(
            WaitlistEntry.Status status, OrganType organNeeded);

    long countByStatus(WaitlistEntry.Status status);

    long countByOrganNeededAndStatus(OrganType organNeeded, WaitlistEntry.Status status);

    boolean existsByPatientUserIdAndOrganNeededAndStatus(
            Long patientUserId, OrganType organNeeded, WaitlistEntry.Status status);

    @Query("""
            SELECT w FROM WaitlistEntry w
            WHERE (:status IS NULL OR w.status = :status)
              AND (:organNeeded IS NULL OR w.organNeeded = :organNeeded)
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city))
            ORDER BY w.urgencyScore DESC, w.listedAt ASC
            """)
    Page<WaitlistEntry> search(@Param("status") WaitlistEntry.Status status,
                               @Param("organNeeded") OrganType organNeeded,
                               @Param("city") String city,
                               Pageable pageable);
}
