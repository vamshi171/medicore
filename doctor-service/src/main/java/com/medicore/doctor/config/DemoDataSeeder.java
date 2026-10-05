package com.medicore.doctor.config;

import com.medicore.doctor.entity.Doctor;
import com.medicore.doctor.repository.DoctorRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Demo-data bootstrap for showcases and interviews.
 *
 * Creates rich doctor profiles for the demo cast created by auth-service's
 * DemoDataSeeder (dr.sharma / dr.mehta / dr.reddy). Idempotent by userId:
 * a profile is only inserted when auth-service can resolve the account AND
 * no profile exists for it yet — so restarts are always safe.
 *
 * If auth-service is still booting (common race on cold starts), the seeder
 * logs and exits; the NEXT boot completes the set. Startup is never fatal.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    /** email -> profile data (must mirror auth-service DemoDataSeeder emails). */
    private static final Map<String, String[]> DEMO_DOCTORS = new LinkedHashMap<>() {{
        put("dr.sharma@medicore.com", new String[]{
                "Dr. Ananya Sharma", "Cardiology", "Interventional cardiologist with 12 years of experience in preventive heart care and catheter-based interventions.",
                "900", "14"});
        put("dr.mehta@medicore.com", new String[]{
                "Dr. Vikram Mehta", "Dermatology", "Consultant dermatologist specialising in clinical dermatology, cosmetology and laser procedures.",
                "700", "9"});
        put("dr.reddy@medicore.com", new String[]{
                "Dr. Kavya Reddy", "Pediatrics", "Pediatrician focused on newborn care, childhood immunisation and growth monitoring.",
                "600", "11"});
    }};

    private final DoctorRepository doctorRepository;
    private final AuthUserLookup authUserLookup;

    public DemoDataSeeder(DoctorRepository doctorRepository, AuthUserLookup authUserLookup) {
        this.doctorRepository = doctorRepository;
        this.authUserLookup = authUserLookup;
    }

    @Override
    public void run(ApplicationArguments args) {
        int created = 0;
        for (var entry : DEMO_DOCTORS.entrySet()) {
            String email = entry.getKey();
            String[] p = entry.getValue();

            Long userId = authUserLookup.findUserIdByEmail(email);
            if (userId == null) {
                log.info("[demo-seed] doctor-service: {} not resolvable yet — skipping (retry next boot)", email);
                continue;
            }
            if (doctorRepository.existsByUserId(userId)) {
                continue;
            }

            Doctor d = new Doctor();
            d.setUserId(userId);
            d.setFullName(p[0]);
            d.setSpecialization(p[1]);
            d.setBio(p[2]);
            d.setConsultationFee(new BigDecimal(p[3]));
            d.setExperienceYears(Integer.parseInt(p[4]));
            d.setAvailableFrom(LocalTime.of(9, 0));
            d.setAvailableTo(LocalTime.of(17, 0));
            d.setAvailable(true);
            d.setActive(true);
            doctorRepository.save(d);
            created++;
        }
        if (created > 0) {
            log.info("[demo-seed] doctor-service: created {} demo doctor profiles", created);
        }
    }
}
