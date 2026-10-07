package com.medicore.auth.config;

import com.medicore.auth.entity.Role;
import com.medicore.auth.entity.User;
import com.medicore.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Map;

/**
 * Demo-data bootstrap for showcases and interviews.
 *
 * Runs AFTER the classic CommandLineRunner seeder (which owns the very first
 * admin/doctor/patient trio) and tops the identity database up to a full demo
 * cast: 3 doctors, 3 patients, 1 admin — all with deterministic emails.
 *
 * Idempotent by email: existing accounts are never touched or duplicated, so
 * restarts, parallel bootstraps and re-runs are all safe.
 *
 * Deterministic IDs matter: auth users are created first and their auto IDs
 * (4..9 for the demo cast) are the userId keys that doctor-service,
 * patient-service and appointment-service reference in their own seeders.
 */
@Configuration
public class DemoDataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    /** email -> [password, role] for the demo cast beyond the classic trio. */
    private static final Map<String, String[]> DEMO_USERS = Map.ofEntries(
            Map.entry("dr.sharma@medicore.com",    new String[]{"Sharma@123",  "DOCTOR"}),
            Map.entry("dr.mehta@medicore.com",     new String[]{"Mehta@123",   "DOCTOR"}),
            Map.entry("dr.reddy@medicore.com",     new String[]{"Reddy@123",   "DOCTOR"}),
            Map.entry("arjun@medicore.com",        new String[]{"Arjun@123",   "PATIENT"}),
            Map.entry("priya@medicore.com",        new String[]{"Priya@123",   "PATIENT"}),
            Map.entry("rahul@medicore.com",        new String[]{"Rahul@123",   "PATIENT"}),
            // Additional patients so the organ waitlist has real identities to point at
            Map.entry("meera@medicore.com",        new String[]{"Meera@123",   "PATIENT"}),
            Map.entry("suresh@medicore.com",       new String[]{"Suresh@123",  "PATIENT"}),
            // Staff roles for the two new domains — provisioned here, never self-registered
            Map.entry("bloodbank@medicore.com",    new String[]{"Bloodbank@123",   "BLOOD_BANK_OFFICER"}),
            Map.entry("coordinator@medicore.com",  new String[]{"Coordinator@123", "TRANSPLANT_COORDINATOR"}));

    @Bean
    ApplicationRunner seedDemoUsers(UserRepository userRepository, BCryptPasswordEncoder encoder) {
        return (ApplicationArguments args) -> {
            int created = 0;
            for (var entry : DEMO_USERS.entrySet()) {
                String email = entry.getKey();
                if (userRepository.existsByEmail(email)) {
                    continue;
                }
                User user = new User();
                user.setEmail(email);
                user.setPassword(encoder.encode(entry.getValue()[0]));
                user.setRole(Role.valueOf(entry.getValue()[1]));
                userRepository.save(user);
                created++;
            }
            if (created > 0) {
                log.info("[demo-seed] auth-service: created {} demo users", created);
            }
        };
    }
}
