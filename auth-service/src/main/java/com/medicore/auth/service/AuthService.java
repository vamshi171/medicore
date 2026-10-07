package com.medicore.auth.service;

import com.medicore.auth.dto.AuthDtos.AuthResponse;
import com.medicore.auth.dto.AuthDtos.LoginRequest;
import com.medicore.auth.dto.AuthDtos.RegisterRequest;
import com.medicore.auth.dto.AuthDtos.UserResponse;
import com.medicore.auth.entity.Role;
import com.medicore.auth.entity.User;
import com.medicore.auth.repository.UserRepository;
import com.medicore.auth.security.JwtTokenProvider;
import com.medicore.common.exception.BadRequestException;
import com.medicore.common.exception.ResourceNotFoundException;
import com.medicore.common.exception.UnauthorizedException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;


@Service
public class AuthService {

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthService(UserRepository userRepository,
                       BCryptPasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    /**
     * Roles a member of the public may choose for themselves. Staff and operator
     * roles (ADMIN, BLOOD_BANK_OFFICER, TRANSPLANT_COORDINATOR) are provisioned
     * administratively, so this is an allow-list rather than a single deny check
     * — adding a staff role later can never accidentally become self-registerable.
     */
    private static final java.util.Set<Role> SELF_REGISTERABLE = java.util.Set.of(Role.PATIENT, Role.DOCTOR);

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (!SELF_REGISTERABLE.contains(request.role())) {
            throw new BadRequestException(
                    "The " + request.role().name().toLowerCase().replace('_', ' ')
                            + " role cannot be self-registered. Contact an administrator.");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email is already registered");
        }

        User user = new User();
        user.setEmail(request.email().toLowerCase(Locale.ROOT));
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(request.role());
        User saved = userRepository.save(user);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email().toLowerCase(Locale.ROOT))
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        // Deactivation gate: deactivated accounts cannot authenticate,
        // even if they still hold a technically valid JWT elsewhere.
        if (!user.isActive()) {
            throw new UnauthorizedException("This account has been deactivated. Contact an administrator.");
        }

        String token = tokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole().name());
        return new AuthResponse(user.getId(), user.getEmail(), user.getRole().name(), token, "Bearer");
    }

    @Transactional(readOnly = true)
    public UserResponse getById(Long id) {
        return userRepository.findById(id).map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("User", id));
    }

    @Transactional(readOnly = true)
    public Page<UserResponse> listUsers(String search, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<User> users = (search == null || search.isBlank())
                ? userRepository.findAll(pageable)
                : userRepository.searchByEmail(search, pageable);
        return users.map(this::toResponse);
    }

    /**
     * ADMIN toggles any account's active status (deactivation is reversible —
     * that's why it's a soft delete, not a row deletion).
     */
    @Transactional
    public UserResponse setStatus(Long userId, boolean active) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        user.setActive(active);
        user.setDeactivatedAt(active ? null : java.time.LocalDateTime.now());
        return toResponse(user);
    }

    /** Self-deactivation (soft delete). */
    @Transactional
    public void deactivate(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        user.setActive(false);
        user.setDeactivatedAt(java.time.LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public com.medicore.auth.dto.AuthDtos.UserResponse internalStatus(Long userId) {
        return userRepository.findById(userId).map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.isActive(),
                user.getCreatedAt() == null ? null : user.getCreatedAt().toString());
    }
}
