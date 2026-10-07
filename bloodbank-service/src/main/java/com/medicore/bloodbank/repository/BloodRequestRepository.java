package com.medicore.bloodbank.repository;

import com.medicore.bloodbank.entity.BloodRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BloodRequestRepository extends JpaRepository<BloodRequest, Long> {

    Page<BloodRequest> findByRequesterUserIdOrderByRequestedAtDesc(Long requesterUserId, Pageable pageable);

    long countByStatus(BloodRequest.Status status);

    @Query("""
            SELECT r FROM BloodRequest r
            WHERE (:status IS NULL OR r.status = :status)
            ORDER BY r.urgency DESC, r.requestedAt DESC
            """)
    Page<BloodRequest> search(@Param("status") BloodRequest.Status status, Pageable pageable);

    @Query("""
            SELECT r FROM BloodRequest r
            WHERE r.requesterUserId = :userId
              AND (:status IS NULL OR r.status = :status)
            ORDER BY r.requestedAt DESC
            """)
    Page<BloodRequest> searchMine(@Param("userId") Long userId,
                                  @Param("status") BloodRequest.Status status,
                                  Pageable pageable);
}
