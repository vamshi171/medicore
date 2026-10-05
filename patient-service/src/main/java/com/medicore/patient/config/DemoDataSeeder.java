package com.medicore.patient.config;

import com.medicore.patient.entity.Patient;
import com.medicore.patient.repository.PatientRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Demo-data bootstrap for showcases and interviews.
 *
 * Creates clinical profiles for the demo patients created by auth-service's
 * DemoDataSeeder (arjun / priya / rahul). Idempotent by userId; startup is
 * never fatal if auth-service is still booting.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    /** email -> profile data (must mirror auth-service DemoDataSeeder emails). */
    private static final Map<String, String[]> DEMO_PATIENTS = new LinkedHashMap<>() {{
        put("arjun@medicore.com", new String[]{
                "Arjun Kumar", "1990-04-12", "MALE", "O+",
                "Dust pollen", "Mild asthma"});
        put("priya@medicore.com", new String[]{
                "Priya Nair", "1985-11-03", "FEMALE", "A+",
                "None", "Hypertension"});
        put("rahul@medicore.com", new String[]{
                "Rahul Verma", "1978-07-25", "MALE", "B+",
                "Penicillin", "Type 2 diabetes"});
    }};

    private final PatientRepository patientRepository;
    private final AuthUserLookup authUserLookup;

    public DemoDataSeeder(PatientRepository patientRepository, AuthUserLookup authUserLookup) {
        this.patientRepository = patientRepository;
        this.authUserLookup = authUserLookup;
    }

    @Override
    public void run(ApplicationArguments args) {
        int created = 0;
        for (var entry : DEMO_PATIENTS.entrySet()) {
            String email = entry.getKey();
            String[] p = entry.getValue();

            Long userId = authUserLookup.findUserIdByEmail(email);
            if (userId == null) {
                log.info("[demo-seed] patient-service: {} not resolvable yet — skipping (retry next boot)", email);
                continue;
            }
            if (patientRepository.existsByUserId(userId)) {
                continue;
            }

            Patient patient = new Patient();
            patient.setUserId(userId);
            patient.setFullName(p[0]);
            patient.setDateOfBirth(LocalDate.parse(p[1]));
            patient.setGender(Patient.Gender.valueOf(p[2]));
            patient.setBloodGroup(p[3]);
            patient.setAllergies(p[4]);
            patient.setChronicConditions(p[5]);
            patient.setActive(true);
            patientRepository.save(patient);
            created++;
        }
        if (created > 0) {
            log.info("[demo-seed] patient-service: created {} demo patient profiles", created);
        }
    }
}
