package com.novellia.pets.common;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CommonConfig {

    @Bean
    public Clock clock(@Value("${app.timezone:}") String timezone) {
        return timezone == null || timezone.isBlank()
                ? Clock.systemDefaultZone()
                : Clock.system(ZoneId.of(timezone.strip()));
    }

    @Bean
    public StoreLock storeLock() {
        return new StoreLock();
    }
}
