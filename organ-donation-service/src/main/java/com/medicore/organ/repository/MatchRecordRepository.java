package com.medicore.organ.repository;

import com.medicore.organ.entity.MatchRecord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MatchRecordRepository extends JpaRepository<MatchRecord, Long> {

    List<MatchRecord> findByStatusOrderByProposedAtDesc(MatchRecord.Status status);

    /** A participant's own allocations — donor or recipient side. */
    List<MatchRecord> findByDonorUserIdOrRecipientUserIdOrderByProposedAtDesc(
            Long donorUserId, Long recipientUserId);

    List<MatchRecord> findByRecipientIdAndStatus(Long recipientId, MatchRecord.Status status);

    long countByStatus(MatchRecord.Status status);

    /**
     * Every allocation ever proposed for one donor/recipient/organ triple.
     * Used to block a duplicate *live* allocation while still allowing a pair to
     * be re-proposed after an earlier attempt was withdrawn (a withdrawn
     * allocation is history, not a permanent bar on the pairing).
     */
    List<MatchRecord> findByDonorIdAndRecipientIdAndOrgan(Long donorId, Long recipientId,
                                                         com.medicore.organ.entity.OrganType organ);

    @Query("""
            SELECT m FROM MatchRecord m
            WHERE (:status IS NULL OR m.status = :status)
            ORDER BY m.proposedAt DESC
            """)
    Page<MatchRecord> search(@Param("status") MatchRecord.Status status, Pageable pageable);
}
