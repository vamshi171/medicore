package com.medicore.bloodbank.service;

import com.medicore.common.exception.AccessDeniedException;
import com.medicore.common.exception.UnauthorizedException;
import com.medicore.common.security.CurrentUser;

/**
 * Defence in depth for the blood bank domain.
 *
 * The gateway already rejects wrong roles for a route, but these checks are
 * repeated in the service layer: a service whose port is reachable directly (or
 * through a future internal caller) must not rely on the edge alone. Ownership
 * decisions — which row a patient may read — can only be made here anyway,
 * because the gateway has no knowledge of row owners.
 */
public final class BloodBankRoles {

    public static final String ADMIN = "ADMIN";
    public static final String DOCTOR = "DOCTOR";
    public static final String PATIENT = "PATIENT";
    public static final String OFFICER = "BLOOD_BANK_OFFICER";

    private BloodBankRoles() {
    }

    public static Long requireUserId() {
        return CurrentUser.requireUserId();
    }

    public static String requireRole() {
        return CurrentUser.requireRole();
    }

    public static boolean isStaff() {
        String role = CurrentUser.requireRole();
        return ADMIN.equals(role) || OFFICER.equals(role);
    }

    /** Inventory management and request decisions are staff-only. */
    public static void requireStaff() {
        if (!isStaff()) {
            throw new AccessDeniedException(
                    "Only an administrator or a blood bank officer may perform this action");
        }
    }

    /** Registry reads (all donors) are staff-only. */
    public static void requireRegistryAccess() {
        requireStaff();
    }

    /**
     * Ownership rule: staff see everything, everyone else only their own rows.
     *
     * @throws AccessDeniedException when the caller is neither staff nor the owner
     */
    public static void requireOwnerOrStaff(Long ownerUserId) {
        String role = CurrentUser.requireRole();
        if (ADMIN.equals(role) || OFFICER.equals(role)) {
            return;
        }
        Long callerId = CurrentUser.requireUserId();
        if (ownerUserId == null || !ownerUserId.equals(callerId)) {
            throw new AccessDeniedException("You may only access your own records");
        }
    }

    /** Any authenticated identity can act as a donor — donors are named per user. */
    public static void requireAuthenticated() {
        if (CurrentUser.get() == null) {
            throw new UnauthorizedException("Authentication required");
        }
    }
}
