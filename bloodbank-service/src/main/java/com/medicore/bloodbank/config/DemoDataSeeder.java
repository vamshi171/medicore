package com.medicore.bloodbank.config;

import com.medicore.bloodbank.entity.BloodComponent;
import com.medicore.bloodbank.entity.BloodDonor;
import com.medicore.bloodbank.entity.BloodGroup;
import com.medicore.bloodbank.entity.BloodInventory;
import com.medicore.bloodbank.entity.BloodRequest;
import com.medicore.bloodbank.repository.BloodDonorRepository;
import com.medicore.bloodbank.repository.BloodInventoryRepository;
import com.medicore.bloodbank.repository.BloodRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Demo-data bootstrap for showcases and interviews.
 *
 * Seeds just enough of each domain to make EVERY role's screen non-empty on
 * first login:
 *   - a patient sees matched availability and its own requests;
 *   - a doctor sees availability and the requests it raised;
 *   - the blood bank officer sees a full board with a decision queue and a
 *     low/expiring-stock workload;
 *   - an admin sees the same plus platform-wide figures.
 *
 * Idempotency, mirroring the other MediCore seeders:
 *   - inventory lots are keyed on their natural lot key (centre+group+component+expiry);
 *   - donors are keyed on userId;
 *   - requests only seed into an empty table.
 *
 * Anything that cannot be resolved (auth-service still booting) is skipped and
 * completed on the next boot — startup is never fatal.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final BloodInventoryRepository inventoryRepository;
    private final BloodDonorRepository donorRepository;
    private final BloodRequestRepository requestRepository;
    private final AuthUserLookup authUserLookup;

    public DemoDataSeeder(BloodInventoryRepository inventoryRepository,
                          BloodDonorRepository donorRepository,
                          BloodRequestRepository requestRepository,
                          AuthUserLookup authUserLookup) {
        this.inventoryRepository = inventoryRepository;
        this.donorRepository = donorRepository;
        this.requestRepository = requestRepository;
        this.authUserLookup = authUserLookup;
    }

    /** centre, city, group, component, units, reserved, threshold, expiryOffsetDays, note */
    private static final Object[][] INVENTORY = {
            {"MediCore Central Blood Bank", "Hyderabad", "O_POSITIVE", "RED_CELLS", 14, 2, 5, 25, "Routine stock"},
            {"MediCore Central Blood Bank", "Hyderabad", "O_NEGATIVE", "RED_CELLS", 3, 0, 4, 18, "Universal donor group — running low"},
            {"MediCore Central Blood Bank", "Hyderabad", "A_POSITIVE", "RED_CELLS", 22, 4, 5, 30, null},
            {"MediCore Central Blood Bank", "Hyderabad", "B_POSITIVE", "PLATELETS", 6, 0, 3, 4, "Short shelf life — use first"},
            {"MediCore Central Blood Bank", "Hyderabad", "AB_POSITIVE", "WHOLE_BLOOD", 9, 1, 3, 21, null},
            {"MediCore Central Blood Bank", "Hyderabad", "O_POSITIVE", "PLASMA", 18, 0, 5, 300, "Frozen store"},
            {"City Care Blood Centre", "Hyderabad", "A_NEGATIVE", "RED_CELLS", 4, 1, 3, 12, null},
            {"City Care Blood Centre", "Hyderabad", "B_NEGATIVE", "RED_CELLS", 2, 0, 3, 9, "Critically low"},
            {"City Care Blood Centre", "Hyderabad", "AB_NEGATIVE", "PLASMA", 7, 0, 2, 240, null},
            {"City Care Blood Centre", "Hyderabad", "O_POSITIVE", "RED_CELLS", 11, 3, 5, 6, "Expiring this week"},
            {"City Care Blood Centre", "Hyderabad", "B_POSITIVE", "RED_CELLS", 7, 0, 3, 20, null},
            {"LifeLine Blood Bank", "Bengaluru", "O_POSITIVE", "RED_CELLS", 26, 2, 5, 27, null},
            {"LifeLine Blood Bank", "Bengaluru", "A_POSITIVE", "PLATELETS", 5, 0, 2, 3, "Expiring"},
            {"LifeLine Blood Bank", "Bengaluru", "B_POSITIVE", "RED_CELLS", 16, 0, 4, 33, null},
            {"LifeLine Blood Bank", "Bengaluru", "A_POSITIVE", "RED_CELLS", 19, 0, 5, 31, null},
            {"LifeLine Blood Bank", "Bengaluru", "O_NEGATIVE", "WHOLE_BLOOD", 5, 0, 3, 15, null},
            {"Red Cross Blood Centre", "Mumbai", "AB_POSITIVE", "RED_CELLS", 12, 2, 4, 24, null},
            {"Red Cross Blood Centre", "Mumbai", "A_NEGATIVE", "PLASMA", 9, 0, 3, 200, null},
            {"Red Cross Blood Centre", "Mumbai", "B_POSITIVE", "RED_CELLS", 8, 5, 3, 11, "Mostly reserved for theatre"},
            {"Red Cross Blood Centre", "Mumbai", "O_POSITIVE", "PLATELETS", 4, 0, 2, 2, "Expiring tomorrow"},
    };

    /** email, fullName, group, age, weightKg, city, phone, lastDonationOffsetDays (null = never) */
    private static final Object[][] DONORS = {
            {"arjun@medicore.com", "Arjun Kumar", "O_POSITIVE", 29, 72, "Hyderabad", "+91 90000 11111", null},
            {"priya@medicore.com", "Priya Nair", "A_NEGATIVE", 34, 58, "Bengaluru", "+91 90000 22222", -40},
            {"rahul@medicore.com", "Rahul Verma", "B_POSITIVE", 41, 81, "Mumbai", "+91 90000 33333", -130},
            {"dr.reddy@medicore.com", "Dr. Kavya Reddy", "AB_POSITIVE", 38, 63, "Hyderabad", "+91 90000 44444", null},
    };

    /** requesterEmail, patientName, group, component, units, urgency, hospital, city, reason, status, note */
    private static final Object[][] REQUESTS = {
            {"arjun@medicore.com", "Arjun Kumar", "O_POSITIVE", "RED_CELLS", 2, "URGENT",
                    "Apollo Hospitals", "Hyderabad", "Post-operative anaemia", "REQUESTED", null},
            {"priya@medicore.com", "Priya Nair", "A_NEGATIVE", "PLASMA", 1, "ROUTINE",
                    "Manipal Hospital", "Bengaluru", "Coagulation support before procedure", "APPROVED",
                    "Approved — reserved at City Care Blood Centre"},
            {"rahul@medicore.com", "Rahul Verma", "B_POSITIVE", "PLATELETS", 3, "CRITICAL",
                    "Lilavati Hospital", "Mumbai", "Dengue with falling platelet count", "FULFILLED",
                    "Issued from the nearest centre"},
            {"dr.sharma@medicore.com", "Meera Iyer", "AB_POSITIVE", "WHOLE_BLOOD", 2, "ROUTINE",
                    "Fortis Hospital", "Hyderabad", "Elective surgery standby", "REJECTED",
                    "On-site reserve is sufficient for this procedure"},
    };

    private static final Map<String, String> DISPLAY_NAMES = Map.of(
            "arjun@medicore.com", "Arjun Kumar",
            "priya@medicore.com", "Priya Nair",
            "rahul@medicore.com", "Rahul Verma",
            "dr.sharma@medicore.com", "Dr. Ananya Sharma",
            "dr.mehta@medicore.com", "Dr. Vikram Mehta",
            "dr.reddy@medicore.com", "Dr. Kavya Reddy",
            "bloodbank@medicore.com", "Sneha Rao");

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int lots = seedInventory();

        Map<String, Long> users = authUserLookup.usersByEmail();
        if (users.isEmpty()) {
            log.info("[demo-seed] bloodbank-service: auth-service not ready — donors/requests seed on next boot");
            return;
        }
        seedDonors(users);
        seedRequests(users);
        if (lots > 0) {
            log.info("[demo-seed] bloodbank-service: created {} demo stock lots", lots);
        }
    }

    private int seedInventory() {
        int created = 0;
        for (Object[] row : INVENTORY) {
            BloodGroup group = BloodGroup.valueOf((String) row[2]);
            BloodComponent component = BloodComponent.valueOf((String) row[3]);
            LocalDate expiry = LocalDate.now().plusDays((Integer) row[7]);
            String centre = (String) row[0];
            if (inventoryRepository.existsByCenterNameAndBloodGroupAndComponentAndExpiryDate(
                    centre, group, component, expiry)) {
                continue;
            }
            BloodInventory lot = new BloodInventory();
            lot.setCenterName(centre);
            lot.setCity((String) row[1]);
            lot.setBloodGroup(group);
            lot.setComponent(component);
            lot.setUnitsAvailable((Integer) row[4]);
            lot.setUnitsReserved((Integer) row[5]);
            lot.setCriticalThreshold((Integer) row[6]);
            lot.setExpiryDate(expiry);
            lot.setNotes((String) row[8]);
            inventoryRepository.save(lot);
            created++;
        }
        return created;
    }

    private void seedDonors(Map<String, Long> users) {
        int created = 0;
        for (Object[] row : DONORS) {
            String email = (String) row[0];
            Long userId = users.get(email);
            if (userId == null || donorRepository.existsByUserId(userId)) {
                continue;
            }
            BloodDonor donor = new BloodDonor();
            donor.setUserId(userId);
            donor.setFullName((String) row[1]);
            donor.setBloodGroup(BloodGroup.valueOf((String) row[2]));
            donor.setAge((Integer) row[3]);
            donor.setWeightKg((Integer) row[4]);
            donor.setCity((String) row[5]);
            donor.setPhone((String) row[6]);
            Object offset = row[7];
            if (offset != null) {
                donor.setLastDonationDate(LocalDate.now().plusDays((Integer) offset));
            }
            // Mirror the service rule: a recent donation puts the donor in the cool-down.
            if (!donor.eligibleNow()) {
                donor.setEligibility(BloodDonor.Eligibility.DEFERRED);
                donor.setDeferralReason("Inside the " + BloodDonor.MIN_DAYS_BETWEEN_DONATIONS + "-day donation cool-down");
            }
            donorRepository.save(donor);
            created++;
        }
        if (created > 0) {
            log.info("[demo-seed] bloodbank-service: registered {} demo donors", created);
        }
    }

    /**
     * Seeds one request per role outcome. Only into an empty table, so restarts
     * never duplicate. A FULFILLED request also draws its units from stock, so
     * the inventory figures and the request history agree.
     */
    private void seedRequests(Map<String, Long> users) {
        if (requestRepository.count() > 0) {
            return;
        }
        Long officerId = users.get("bloodbank@medicore.com");
        LocalDateTime now = LocalDateTime.now();
        int created = 0;

        for (Object[] row : REQUESTS) {
            String email = (String) row[0];
            Long requesterId = users.get(email);
            if (requesterId == null) {
                continue;
            }
            BloodRequest request = new BloodRequest();
            request.setRequesterUserId(requesterId);
            request.setRequesterName(DISPLAY_NAMES.getOrDefault(email, email));
            request.setRequesterRole(email.startsWith("dr.") ? "DOCTOR" : "PATIENT");
            request.setPatientName((String) row[1]);
            request.setBloodGroup(BloodGroup.valueOf((String) row[2]));
            request.setComponent(BloodComponent.valueOf((String) row[3]));
            request.setUnitsNeeded((Integer) row[4]);
            request.setUrgency(BloodRequest.Urgency.valueOf((String) row[5]));
            request.setHospital((String) row[6]);
            request.setCity((String) row[7]);
            request.setReason((String) row[8]);

            BloodRequest.Status status = BloodRequest.Status.valueOf((String) row[9]);
            request.setStatus(status);
            String note = (String) row[10];
            if (status != BloodRequest.Status.REQUESTED) {
                request.setDecidedByUserId(officerId);
                request.setDecisionNote(note);
                request.setDecidedAt(now.minusHours(6));
            }
            if (status == BloodRequest.Status.FULFILLED) {
                request.setFulfilledFrom(issueStock(request));
                request.setFulfilledAt(now.minusHours(3));
            }
            requestRepository.save(request);
            created++;
        }
        if (created > 0) {
            log.info("[demo-seed] bloodbank-service: created {} demo blood requests", created);
        }
    }

    /**
     * FIFO issue used by the seeder for the FULFILLED demo request. Mirrors
     * BloodRequestService#issueStock: earliest expiry first, never partial.
     */
    private String issueStock(BloodRequest request) {
        int remaining = request.getUnitsNeeded();
        List<BloodInventory> candidates = inventoryRepository.findIssueCandidates(
                request.getBloodGroup(), request.getComponent(), LocalDate.now());
        StringBuilder used = new StringBuilder();
        for (BloodInventory lot : candidates) {
            if (remaining <= 0) {
                break;
            }
            int take = Math.min(lot.availableUnits(), remaining);
            lot.setUnitsAvailable(lot.getUnitsAvailable() - take);
            remaining -= take;
            if (used.length() > 0) {
                used.append(", ");
            }
            used.append(lot.getCenterName()).append(" (")
                    .append(lot.getBloodGroup().getLabel()).append(' ')
                    .append(lot.getComponent().getLabel()).append(" x").append(take).append(')');
        }
        return used.length() == 0 ? null : used.toString();
    }
}
