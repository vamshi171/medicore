package com.medicore.organ.service;

import com.medicore.common.dto.PageResponse;
import com.medicore.common.exception.AccessDeniedException;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import com.medicore.organ.config.AuthUserLookup;
import com.medicore.organ.dto.OrganDtos.CandidateResponse;
import com.medicore.organ.dto.OrganDtos.Option;
import com.medicore.organ.dto.OrganDtos.WaitlistRequest;
import com.medicore.organ.dto.OrganDtos.WaitlistResponse;
import com.medicore.organ.dto.OrganDtos.WaitlistStatusRequest;
import com.medicore.organ.entity.MatchRecord;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.entity.OrganType;
import com.medicore.organ.entity.WaitlistEntry;
import com.medicore.organ.repository.MatchRecordRepository;
import com.medicore.organ.repository.OrganDonorRepository;
import com.medicore.organ.repository.WaitlistEntryRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

/**
 * The transplant waitlist.
 *
 * Access split mirrors the real clinical workflow: a DOCTOR may list a patient
 * and read the list, but only a TRANSPLANT_COORDINATOR may change status or see
 * the ranked candidate donors. A PATIENT sees only their own entries.
 */
@Service
public class WaitlistService {

    private final WaitlistEntryRepository waitlistRepository;
    private final OrganDonorRepository donorRepository;
    private final MatchRecordRepository matchRepository;
    private final OrganCompatibilityService compatibility;

    public WaitlistService(WaitlistEntryRepository waitlistRepository,
                           OrganDonorRepository donorRepository,
                           MatchRecordRepository matchRepository,
                           OrganCompatibilityService compatibility /* retained for candidate ranking */) {
        this.waitlistRepository = waitlistRepository;
        this.donorRepository = donorRepository;
        this.matchRepository = matchRepository;
        this.compatibility = compatibility;
    }

    // --------------------------------------------------------------- self view

    /** A patient's own waiting-list entries. */
    @Transactional(readOnly = true)
    public List<WaitlistResponse> mine() {
        Long userId = OrganRoles.requireUserId();
        return waitlistRepository.findByPatientUserIdOrderByListedAtDesc(userId).stream()
                .map(WaitlistResponse::from)
                .toList();
    }

    // ------------------------------------------------------------ clinician ops

    /**
     * Lists a patient. The patient is identified by auth userId or, more
     * conveniently for a clinician, by email — resolved over the internal API so
     * the caller never has to know another service's surrogate keys.
     */
    @Transactional
    public WaitlistResponse add(WaitlistRequest request, AuthUserLookup authUserLookup) {
        OrganRoles.requireClinician();

        Long patientUserId = request.patientUserId();
        String patientEmail = request.patientEmail() == null ? null
                : request.patientEmail().trim().toLowerCase(Locale.ROOT);
        if (patientUserId == null) {
            if (patientEmail == null || patientEmail.isBlank()) {
                throw new BadRequestException("Provide either patientUserId or patientEmail");
            }
            patientUserId = authUserLookup.findUserIdByEmail(patientEmail);
            if (patientUserId == null) {
                throw new BadRequestException(
                        "No MediCore account found for " + patientEmail
                                + " (auth-service may be starting up — retry in a moment)");
            }
        }
        if (waitlistRepository.existsByPatientUserIdAndOrganNeededAndStatus(
                patientUserId, request.organNeeded(), WaitlistEntry.Status.WAITING)) {
            throw new BadRequestException("This patient is already waiting for a "
                    + request.organNeeded().getLabel());
        }

        WaitlistEntry entry = new WaitlistEntry();
        entry.setPatientUserId(patientUserId);
        entry.setPatientName(resolveName(request.patientName(), patientEmail, patientUserId));
        entry.setOrganNeeded(request.organNeeded());
        entry.setBloodGroup(request.bloodGroup());
        entry.setUrgencyScore(request.urgencyScore());
        entry.setHospital(request.hospital().trim());
        entry.setCity(request.city().trim());
        entry.setReferringDoctorUserId(OrganRoles.requireUserId());
        entry.setNotes(request.notes());
        entry.setStatus(WaitlistEntry.Status.WAITING);
        return WaitlistResponse.from(waitlistRepository.save(entry));
    }

    /** Clinical staff see the whole list, ordered by urgency. */
    @Transactional(readOnly = true)
    public PageResponse<WaitlistResponse> list(WaitlistEntry.Status status, OrganType organNeeded,
                                               String city, int page, int size) {
        OrganRoles.requireClinician();
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.max(1, Math.min(size, 50)));
        String normalizedCity = (city == null || city.isBlank()) ? null : city.trim().toLowerCase(Locale.ROOT);
        Page<WaitlistEntry> result = waitlistRepository.search(status, organNeeded, normalizedCity, pageable);
        List<WaitlistResponse> content = result.getContent().stream().map(WaitlistResponse::from).toList();
        return new PageResponse<>(content, result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    /** Clinical staff, a coordinator, or the patient whose entry it is. */
    @Transactional(readOnly = true)
    public WaitlistResponse getById(Long id) {
        WaitlistEntry entry = requireEntry(id);
        String role = OrganRoles.requireRole();
        boolean clinician = OrganRoles.DOCTOR.equals(role);
        if (!OrganRoles.isCoordinator() && !clinician) {
            Long callerId = OrganRoles.requireUserId();
            if (!callerId.equals(entry.getPatientUserId())) {
                throw new AccessDeniedException("You may only access your own waitlist entries");
            }
        }
        return WaitlistResponse.from(entry);
    }

    /** MATCHED / TRANSPLANTED / REMOVED are allocation decisions — coordinator only. */
    @Transactional
    public WaitlistResponse setStatus(Long id, WaitlistStatusRequest request) {
        OrganRoles.requireCoordinator();
        WaitlistEntry entry = requireEntry(id);

        WaitlistEntry.Status target = request.status();
        if (target == WaitlistEntry.Status.WAITING) {
            throw new BadRequestException("Status can only be moved forward to MATCHED, TRANSPLANTED or REMOVED");
        }
        if (target == WaitlistEntry.Status.TRANSPLANTED) {
            entry.setTransplantedAt(LocalDateTime.now());
        }
        if (target == WaitlistEntry.Status.MATCHED) {
            entry.setMatchedAt(LocalDateTime.now());
        }
        entry.setStatus(target);
        if (request.note() != null && !request.note().isBlank()) {
            entry.setNotes(request.note());
        }
        return WaitlistResponse.from(entry);
    }

    /**
     * The ranked candidate donors for one waiting patient.
     *
     * This is the domain's headline operation: it pulls every committed pledge
     * for the needed organ and orders them by how well they match, so a
     * coordinator sees the best option first instead of scanning a raw table.
     * Coordinator/admin only — it exposes donor identities.
     */
    @Transactional(readOnly = true)
    public List<CandidateResponse> candidates(Long id) {
        OrganRoles.requireCoordinator();
        WaitlistEntry entry = requireEntry(id);
        if (entry.getStatus() != WaitlistEntry.Status.WAITING) {
            throw new BadRequestException("Only a WAITING entry can be matched");
        }

        List<OrganDonor> committed = donorRepository.findCommittedDonorsFor(entry.getOrganNeeded());
        return compatibility.rankCandidates(entry, committed).stream()
                .map(donor -> {
                    OrganCompatibilityService.Tier tier = compatibility.evaluate(donor, entry);
                    return new CandidateResponse(
                            donor.getId(), donor.getUserId(), donor.getFullName(),
                            donor.getBloodGroup(), donor.getBloodGroup().getLabel(),
                            donor.getAge(), donor.getCity(),
                            donor.getOrgans().stream().sorted()
                                    .map(o -> new Option(o.name(), o.getLabel())).toList(),
                            tier.name(), tier.label(), tier.rank(),
                            entry.getOrganNeeded().hasBloodGroupBarrier(),
                            donor.getMedicalNotes());
                })
                .toList();
    }

    WaitlistEntry requireEntry(Long id) {
        return waitlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Waitlist entry", id));
    }

    long countByStatus(WaitlistEntry.Status status) {
        return waitlistRepository.countByStatus(status);
    }

    long countWaitingFor(OrganType organ) {
        return waitlistRepository.countByOrganNeededAndStatus(organ, WaitlistEntry.Status.WAITING);
    }

    long openAllocationsFor(Long recipientId) {
        return matchRepository.findByRecipientIdAndStatus(recipientId, MatchRecord.Status.PROPOSED).size();
    }

    private static String resolveName(String provided, String email, Long userId) {
        if (provided != null && !provided.isBlank()) {
            return provided.trim();
        }
        if (email != null && email.contains("@")) {
            String local = email.substring(0, email.indexOf('@'));
            String cleaned = local.replace('.', ' ').replace('_', ' ').trim();
            if (!cleaned.isBlank()) {
                String[] words = cleaned.split("\\s+");
                StringBuilder sb = new StringBuilder();
                for (String word : words) {
                    if (word.isEmpty()) {
                        continue;
                    }
                    if (sb.length() > 0) {
                        sb.append(' ');
                    }
                    sb.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1));
                }
                return sb.toString();
            }
        }
        return "Patient #" + userId;
    }
}
