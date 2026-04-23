package com.microfinance.config;

import com.microfinance.security.jwt.AuthEntryPointJwt;
import com.microfinance.security.jwt.AuthTokenFilter;
import com.microfinance.security.services.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final AuthEntryPointJwt unauthorizedHandler;

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/staff/me").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/staff/*/password").authenticated()

                        // CHANGED: keep staff management ADMIN-only
                        .requestMatchers("/api/v1/staff/**").hasRole("ADMIN")
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        // CHANGED: applicant/application modules for all operational roles
                        .requestMatchers("/api/applicants/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")
                        .requestMatchers("/api/applications/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")
                        .requestMatchers("/api/loan-applications/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")

                        // CHANGED: loan officer must be allowed for risk/recommendation too
                        .requestMatchers("/api/credit-score/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")
                        .requestMatchers("/api/risk-assessments/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")
                        .requestMatchers("/api/recommendations/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")

                        // CHANGED: repayments/reports/dashboard available to all operational roles
                        .requestMatchers("/api/repayments/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")
                        .requestMatchers("/api/reports/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")
                        .requestMatchers("/api/dashboard/**").hasAnyRole("ADMIN", "LOAN_OFFICER", "BANK_MANAGER")
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
