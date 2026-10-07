package com.medicore.organ.service;

import com.medicore.common.exception.AccessDeniedException;
import com.medicore.common.exception.UnauthorizedException;
import com.medicore.common.security.CurrentUser;

/**
 * Defence in depth for the organ-donation domain.
 *
 * The gateway rejects wrong roles per route; these checks are repeated here so
 * the rules survive a direct caller, and so row-level ownership (which the edge
 * cannot express) is enforced in exactly one place.
 *
 * The interesting split is between the two clinician roles:
 *   - DOCTOR               may list a patient and read the waitlist, but may not allocate;
 *   - TRANSPLANT_COORDINATOR runs the registry, verification and allocation;
 *   - ADMIN                may do everything a coordinator can.
 */
public final class OrganRoles {

    public static final String ADMIN = "ADMIN";
    public static final String DOCTOR = "DOCTOR";
    public static final String PATIENT = "PATIENT";
    public static final String COORDINATOR = "TRANSPLANT_COORDINATOR";

    private OrganRoles() {
    }

    public static Long requireUserId() {
        return CurrentUser.requireUserId();
    }

    public static String requireRole() {
        return CurrentUser.requireRole();
    }

    public static boolean isCoordinator() {
        String role = CurrentUser.requireRole();
        return ADMIN.equals(role) || COORDINATOR.equals(role);
    }

    /** Registry, verification and allocation — coordinator or admin only. */
    public static void requireCoordinator() {
        if (!isCoordinator()) {
            throw new AccessDeniedException(
                    "Only a transplant coordinator or an administrator may perform this action");
        }
    }

    /** Listing a patient needs a clinician, not the patient themselves. */
    public static void requireClinician() {
        String role = CurrentUser.requireRole();
        if (!ADMIN.equals(role) && !COORDINATOR.equals(role) && !DOCTOR.equals(role)) {
            throw new AccessDeniedException("Only clinical staff may list a patient for transplant");
        }
    }

    /** Reading a single row: coordinator/admin, or the person it belongs to. */
    public static void requireOwnerOrCoordinator(Long ownerUserId) {
        if (isCoordinator()) {
            return;
        }
        Long callerId = CurrentUser.requireUserId();
        if (ownerUserId == null || !ownerUserId.equals(callerId)) {
            throw new AccessDeniedException("You may only access your own records");
        }
    }

    public static void requireAuthenticated() {
        if (CurrentUser.get() == null) {
            throw new UnauthorizedException("Authentication required");
        }
    }
}
