package com.medicore.auth.entity;

/**
 * Platform roles.
 *
 * ADMIN / DOCTOR / PATIENT are the original three. The two added roles are
 * domain operators: a BLOOD_BANK_OFFICER runs transfusion stock and request
 * decisions, and a TRANSPLANT_COORDINATOR runs organ verification and
 * allocation. Both are staff roles — neither may self-register (see
 * AuthService#register), so they are provisioned administratively.
 */
public enum Role {
    ADMIN,
    DOCTOR,
    PATIENT,
    BLOOD_BANK_OFFICER,
    TRANSPLANT_COORDINATOR
}
