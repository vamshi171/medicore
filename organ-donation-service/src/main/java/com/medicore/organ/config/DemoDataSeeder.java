package com.medicore.organ.config;

import com.medicore.organ.entity.BloodGroup;
import com.medicore.organ.entity.MatchRecord;
import com.medicore.organ.entity.OrganDonor;
import com.medicore.organ.entity.OrganType;
import com.medicore.organ.entity.WaitlistEntry;
import com.medicore.organ.repository.MatchRecordRepository;
import com.medicore.organ.repository.OrganDonorRepository;
import com.medicore.organ.repository.WaitlistEntryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Demo-data bootstrap for showcases and interviews.
 *
 * The shape of the seed is chosen so that EVERY role finds something to do:
 *   - PATIENT           owns a pledge and a waitlist entry, and can see its own allocation;
 *   - DOCTOR            can read the whole waitlist and stats, but cannot allocate;
 *   - TRANSPLANT_COORDINATOR has a verification queue, a waiting list with
 *                          compatible candidates, and an allocation to advance;
 *   - ADMIN             sees the same figures platform-wide.
 *
 * All four match tiers appear in the seeded data, so the ranking engine is
 * demonstrable on first login: EXACT (dr.sharma -> suresh, heart),
 * ABO_COMPATIBLE (dr.sharma -> arjun, kidney),
 * IMMUNE_PRIVILEGED (dr.reddy -> priya, cornea), and INCOMPATIBLE pairs that the
 * engine correctly refuses (rahul B+ cannot give a kidney to arjun A+).
 *
 * Idempotent: pledges by userId, waitlist via count guard, allocations by
 * (donor, recipient, organ). Startup is never fatal if auth-service is booting.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final OrganDonorRepository donorRepository;
    private final WaitlistEntryRepository waitlistRepository;
    private final MatchRecordRepository matchRepository;
    private final AuthUserLookup authUserLookup;

    public DemoDataSeeder(OrganDonorRepository donorRepository,
                          WaitlistEntryRepository waitlistRepository,
                          MatchRecordRepository matchRepository,
                          AuthUserLookup authUserLookup) {
        this.donorRepository = donorRepository;
        this.waitlistRepository = waitlistRepository;
        this.matchRepository = matchRepository;
        this.authUserLookup = authUserLookup;
    }

    /** email, fullName, group, age, city, phone, status, organs... */
    private static final Object[][] PLEDGES = {
            {"dr.sharma@medicore.com", "Dr. Ananya Sharma", "O_NEGATIVE", 41, "Hyderabad", "+91 90000 55555",
                    "VERIFIED", new String[]{"KIDNEY", "HEART"}},
            {"dr.reddy@medicore.com", "Dr. Kavya Reddy", "AB_POSITIVE", 38, "Hyderabad", "+91 90000 44444",
                    "ACTIVE", new String[]{"CORNEA", "TISSUES"}},
            {"dr.mehta@medicore.com", "Dr. Vikram Mehta", "A_POSITIVE", 44, "Bengaluru", "+91 90000 66666",
                    "VERIFIED", new String[]{"LUNGS", "PANCREAS"}},
            {"rahul@medicore.com", "Rahul Verma", "B_POSITIVE", 41, "Mumbai", "+91 90000 33333",
                    "ACTIVE", new String[]{"LIVER", "KIDNEY"}},
            {"priya@medicore.com", "Priya Nair", "A_POSITIVE", 34, "Bengaluru", "+91 90000 22222",
                    "PENDING", new String[]{"KIDNEY", "PANCREAS"}},
    };

    /** patientEmail, patientName, organ, group, urgency, hospital, city, notes */
    private static final Object[][] WAITLIST = {
            {"arjun@medicore.com", "Arjun Kumar", "KIDNEY", "A_POSITIVE", 7,
                    "Nephrology Institute", "Hyderabad", "Dialysis three times a week"},
            {"meera@medicore.com", "Meera Iyer", "LIVER", "B_POSITIVE", 9,
                    "MediCore Transplant Centre", "Hyderabad", "Decompensated cirrhosis"},
            {"suresh@medicore.com", "Suresh Patil", "HEART", "O_POSITIVE", 5,
                    "MediCore Transplant Centre", "Mumbai", "Advanced cardiomyopathy"},
            {"priya@medicore.com", "Priya Nair", "CORNEA", "A_NEGATIVE", 3,
                    "City Eye Hospital", "Bengaluru", "Corneal opacity, left eye"},
            // Combined liver-kidney listing. Chosen deliberately: rahul (B+) has
            // pledged a kidney but is ABO-incompatible with this A+ recipient, so
            // the candidate engine has a real INCOMPATIBLE pair to filter out —
            // and the refusal path is demonstrable on seeded data.
            {"meera@medicore.com", "Meera Iyer", "KIDNEY", "A_POSITIVE", 8,
                    "MediCore Transplant Centre", "Hyderabad", "Combined liver-kidney listing"},
    };

    /** donorEmail, recipientEmail, organ, status, note */
    private static final Object[][] MATCHES = {
            {"dr.sharma@medicore.com", "arjun@medicore.com", "KIDNEY", "COMPLETED",
                    "Living donor programme — transplant completed successfully"},
            {"rahul@medicore.com", "meera@medicore.com", "LIVER", "PROPOSED",
                    "Awaiting recipient confirmation and cross-match"},
    };

    private static final Map<String, String> PATIENT_NAMES = Map.of(
            "arjun@medicore.com", "Arjun Kumar",
            "priya@medicore.com", "Priya Nair",
            "rahul@medicore.com", "Rahul Verma",
            "meera@medicore.com", "Meera Iyer",
            "suresh@medicore.com", "Suresh Patil");

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Map<String, Long> users = authUserLookup.usersByEmail();
        if (users.isEmpty()) {
            log.info("[demo-seed] organ-donation-service: auth-service not ready — seeding on next boot");
            return;
        }
        int pledges = seedPledges(users);
        int waiting = seedWaitlist(users);
        int matches = seedMatches(users);

        if (pledges + waiting + matches > 0) {
            log.info("[demo-seed] organ-donation-service: created {} pledges, {} waitlist entries, {} allocations",
                    pledges, waiting, matches);
        }
    }

    private int seedPledges(Map<String, Long> users) {
        Long coordinatorId = users.get("coordinator@medicore.com");
        LocalDateTime now = LocalDateTime.now().minusDays(12);
        int created = 0;

        for (Object[] row : PLEDGES) {
            String email = (String) row[0];
            Long userId = users.get(email);
            if (userId == null || donorRepository.existsByUserId(userId)) {
                continue;
            }
            OrganDonor donor = new OrganDonor();
            donor.setUserId(userId);
            donor.setFullName((String) row[1]);
            donor.setBloodGroup(BloodGroup.valueOf((String) row[2]));
            donor.setAge((Integer) row[3]);
            donor.setCity((String) row[4]);
            donor.setPhone((String) row[5]);
            donor.setOrgans(toOrgans((String[]) row[7]));
            donor.setConsentSigned(true);
            donor.setConsentSignedAt(now);
            donor.setStatus(OrganDonor.Status.valueOf((String) row[6]));
            if (donor.getStatus() != OrganDonor.Status.PENDING) {
                donor.setVerifiedByUserId(coordinatorId);
                donor.setVerifiedAt(now.plusDays(1));
            }
            donorRepository.save(donor);
            created++;
        }
        return created;
    }

    private int seedWaitlist(Map<String, Long> users) {
        if (waitlistRepository.count() > 0) {
            return 0;
        }
        Long coordinatorId = users.get("coordinator@medicore.com");
        Long doctorId = users.get("dr.sharma@medicore.com");
        int created = 0;

        for (int i = 0; i < WAITLIST.length; i++) {
            Object[] row = WAITLIST[i];
            String email = (String) row[0];
            Long patientUserId = users.get(email);
            if (patientUserId == null) {
                continue;
            }
            WaitlistEntry entry = new WaitlistEntry();
            entry.setPatientUserId(patientUserId);
            entry.setPatientName((String) row[1]);
            entry.setOrganNeeded(OrganType.valueOf((String) row[2]));
            entry.setBloodGroup(BloodGroup.valueOf((String) row[3]));
            entry.setUrgencyScore((Integer) row[4]);
            entry.setHospital((String) row[5]);
            entry.setCity((String) row[6]);
            entry.setNotes((String) row[7]);
            // Alternate the listing clinician so both roles own a record.
            entry.setReferringDoctorUserId(i % 2 == 0 ? coordinatorId : doctorId);
            entry.setStatus(WaitlistEntry.Status.WAITING);
            waitlistRepository.save(entry);
            created++;
        }
        return created;
    }

    private int seedMatches(Map<String, Long> users) {
        Long coordinatorId = users.get("coordinator@medicore.com");
        int created = 0;

        for (Object[] row : MATCHES) {
            Long donorUserId = users.get((String) row[0]);
            Long recipientUserId = users.get((String) row[1]);
            if (donorUserId == null || recipientUserId == null) {
                continue;
            }
            OrganDonor donor = donorRepository.findByUserId(donorUserId).orElse(null);
            WaitlistEntry recipient = waitlistRepository
                    .findByPatientUserIdOrderByListedAtDesc(recipientUserId).stream()
                    .filter(w -> w.getOrganNeeded() == OrganType.valueOf((String) row[2]))
                    .findFirst()
                    .orElse(null);
            if (donor == null || recipient == null) {
                continue;
            }
            if (!matchRepository.findByDonorIdAndRecipientIdAndOrgan(
                    donor.getId(), recipient.getId(), recipient.getOrganNeeded()).isEmpty()) {
                continue;
            }

            MatchRecord.Status status = MatchRecord.Status.valueOf((String) row[3]);
            MatchRecord match = new MatchRecord();
            match.setDonorId(donor.getId());
            match.setDonorUserId(donor.getUserId());
            match.setDonorName(donor.getFullName());
            match.setRecipientId(recipient.getId());
            match.setRecipientUserId(recipient.getPatientUserId());
            match.setRecipientName(recipient.getPatientName());
            match.setOrgan(recipient.getOrganNeeded());
            match.setCompatibilityTier(tierFor(donor, recipient));
            match.setStatus(status);
            match.setProposedByUserId(coordinatorId);
            match.setNotes((String) row[4]);

            if (status == MatchRecord.Status.PROPOSED) {
                recipient.setStatus(WaitlistEntry.Status.MATCHED);
                recipient.setMatchedAt(LocalDateTime.now().minusDays(2));
            } else if (status == MatchRecord.Status.COMPLETED) {
                match.setConfirmedAt(LocalDateTime.now().minusDays(9));
                match.setCompletedAt(LocalDateTime.now().minusDays(6));
                recipient.setStatus(WaitlistEntry.Status.TRANSPLANTED);
                recipient.setMatchedAt(LocalDateTime.now().minusDays(9));
                recipient.setTransplantedAt(LocalDateTime.now().minusDays(6));
            }
            matchRepository.save(match);
            created++;
        }
        return created;
    }

    /** Mirrors the compatibility engine's labels for the seeded allocations. */
    private static String tierFor(OrganDonor donor, WaitlistEntry recipient) {
        OrganType organ = recipient.getOrganNeeded();
        if (organ.immunePrivileged()) {
            return "No blood-group barrier";
        }
        return donor.getBloodGroup() == recipient.getBloodGroup()
                ? "Exact blood group match" : "ABO compatible";
    }

    private static Set<OrganType> toOrgans(String[] names) {
        Set<OrganType> organs = new LinkedHashSet<>();
        for (String name : names) {
            organs.add(OrganType.valueOf(name));
        }
        return organs;
    }

    /** Kept for parity with the other services' seeders (unused names list). */
    static List<String> demoPatientEmails() {
        return List.copyOf(PATIENT_NAMES.keySet());
    }
}
