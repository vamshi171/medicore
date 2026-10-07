-- MediCore database-per-service initialization (runs on first container start)
CREATE DATABASE IF NOT EXISTS medicore_auth DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS medicore_patients DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS medicore_doctors DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS medicore_appointments DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS medicore_notifications DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS medicore_bloodbank DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS medicore_organs DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON medicore_auth.* TO 'medicore'@'%';
GRANT ALL PRIVILEGES ON medicore_patients.* TO 'medicore'@'%';
GRANT ALL PRIVILEGES ON medicore_doctors.* TO 'medicore'@'%';
GRANT ALL PRIVILEGES ON medicore_appointments.* TO 'medicore'@'%';
GRANT ALL PRIVILEGES ON medicore_notifications.* TO 'medicore'@'%';
GRANT ALL PRIVILEGES ON medicore_bloodbank.* TO 'medicore'@'%';
GRANT ALL PRIVILEGES ON medicore_organs.* TO 'medicore'@'%';
FLUSH PRIVILEGES;

-- Table indexes (incl. the composite (doctor_id, appointment_date) used by the
-- overlap-check query) are declared via JPA @Index annotations and created by
-- Hibernate at startup.
