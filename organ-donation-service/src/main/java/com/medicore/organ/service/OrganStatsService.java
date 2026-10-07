package com.medicore.organ.service;

import com.medicore.organ.dto.OrganDtos.OrganCount;
import com.medicore.organ.dto.OrganDtos.StatsResponse;
import com.medicore.organ.entity.MatchRecord;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.entity.OrganType;
import com.medicore.organ.entity.WaitlistEntry;
import com.medicore.organ.repository.OrganDonorRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

/** Dashboard aggregates for the doctor, coordinator and admin consoles. */
@Service
public class OrganStatsService {

    private final OrganPledgeService pledgeService;
    private final WaitlistService waitlistService;
    private final MatchService matchService;
    private final OrganDonorRepository donorRepository;

    public OrganStatsService(OrganPledgeService pledgeService,
                             WaitlistService waitlistService,
                             MatchService matchService,
                             OrganDonorRepository donorRepository) {
        this.pledgeService = pledgeService;
        this.waitlistService = waitlistService;
        this.matchService = matchService;
        this.donorRepository = donorRepository;
    }

    @Transactional(readOnly = true)
    public StatsResponse stats() {
        // Doctors need these figures for their console but get no registry rows.
        OrganRoles.requireClinician();

        List<OrganCount> byOrgan = Arrays.stream(OrganType.values())
                .map(organ -> new OrganCount(
                        organ.name(),
                        organ.getLabel(),
                        waitlistService.countWaitingFor(organ),
                        donorRepository.countUsablePledgesFor(organ)))
                .toList();

        return new StatsResponse(
                pledgeService.countActive(),
                pledgeService.countByStatus(OrganDonor.Status.PENDING),
                pledgeService.countByStatus(OrganDonor.Status.VERIFIED),
                pledgeService.countByStatus(OrganDonor.Status.ACTIVE),
                pledgeService.countByStatus(OrganDonor.Status.REVOKED),
                waitlistService.countByStatus(WaitlistEntry.Status.WAITING),
                waitlistService.countByStatus(WaitlistEntry.Status.MATCHED),
                waitlistService.countByStatus(WaitlistEntry.Status.TRANSPLANTED),
                matchService.countByStatus(MatchRecord.Status.PROPOSED)
                        + matchService.countByStatus(MatchRecord.Status.CONFIRMED)
                        + matchService.countByStatus(MatchRecord.Status.COMPLETED)
                        + matchService.countByStatus(MatchRecord.Status.WITHDRAWN),
                matchService.countByStatus(MatchRecord.Status.PROPOSED),
                matchService.countByStatus(MatchRecord.Status.COMPLETED),
                byOrgan);
    }
}
