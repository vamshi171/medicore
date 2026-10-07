package com.medicore.bloodbank.repository;

import com.medicore.bloodbank.entity.BloodDonor;
import com.medicore.bloodbank.entity.BloodGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface BloodDonorRepository extends JpaRepository<BloodDonor, Long> {

    Optional<BloodDonor> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    Optional<BloodDonor> findByIdAndActiveTrue(Long id);

    long countByActiveTrue();

    long countByEligibility(BloodDonor.Eligibility eligibility);

    @Query("""
            SELECT d FROM BloodDonor d
            WHERE d.active = true
              AND (:bloodGroup IS NULL OR d.bloodGroup = :bloodGroup)
              AND (:city IS NULL OR LOWER(d.city) = LOWER(:city))
              AND (:eligibility IS NULL OR d.eligibility = :eligibility)
            ORDER BY d.bloodGroup, d.fullName
            """)
    Page<BloodDonor> search(@Param("bloodGroup") BloodGroup bloodGroup,
                            @Param("city") String city,
                            @Param("eligibility") BloodDonor.Eligibility eligibility,
                            Pageable pageable);
}
