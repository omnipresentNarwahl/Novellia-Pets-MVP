package com.novellia.pets.demo;

import com.novellia.pets.pet.PetRepository;
import com.novellia.pets.pet.PetRequest;
import com.novellia.pets.pet.PetResponse;
import com.novellia.pets.pet.PetService;
import com.novellia.pets.pet.Species;
import com.novellia.pets.record.RecordRequest;
import com.novellia.pets.record.RecordService;
import com.novellia.pets.record.RecordType;
import java.time.Clock;
import java.time.LocalDate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Adds a few pets and records at startup so the dashboard is populated. It goes through the
 * services, so the same validation applies. Dates are relative to today so "last 30 days" is never empty.
 */
@Component
@ConditionalOnProperty(name = "app.seed-demo-data", havingValue = "true")
public class DemoDataLoader implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DemoDataLoader.class);

    private final PetRepository pets;
    private final PetService petService;
    private final RecordService recordService;
    private final Clock clock;

    public DemoDataLoader(PetRepository pets, PetService petService, RecordService recordService, Clock clock) {
        this.pets = pets;
        this.petService = petService;
        this.recordService = recordService;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!pets.findAll().isEmpty()) {
            return;
        }
        LocalDate today = LocalDate.now(clock);

        PetResponse biscuit = petService.create(new PetRequest("Biscuit", Species.DOG, null, "Golden Retriever",
                today.minusYears(4).minusMonths(2), "Loves the beach. Allergic to chicken-based treats."));
        record(biscuit, RecordType.VACCINATION, "Rabies booster", today.minusMonths(3), "Maple Street Vet",
                "Three-year vaccine. Next due in 2029.");
        record(biscuit, RecordType.VET_VISIT, "Annual checkup", today.minusDays(12), "Maple Street Vet",
                "Healthy weight. Teeth look good.");
        record(biscuit, RecordType.MEDICATION, "Flea and tick prevention", today.minusDays(8), null,
                "Monthly chewable.");
        record(biscuit, RecordType.OTHER, "Microchip registration", today.minusYears(2), "City Animal Services",
                null);

        PetResponse miso = petService.create(new PetRequest("Miso", Species.CAT, null, "Domestic shorthair",
                today.minusYears(7), "Indoor cat. Prefers wet food."));
        record(miso, RecordType.PROCEDURE, "Dental cleaning", today.minusMonths(4), "Harbor Animal Hospital",
                "Two extractions. Soft food for a week.");
        record(miso, RecordType.VACCINATION, "FVRCP booster", today.minusMonths(10), "Harbor Animal Hospital",
                null);
        record(miso, RecordType.VET_VISIT, "Limping on back left leg", today.minusDays(20),
                "Harbor Animal Hospital", "Minor sprain. Rest and follow up if it continues.");
        record(miso, RecordType.MEDICATION, "Anti-inflammatory", today.minusDays(19), "Harbor Animal Hospital",
                "Half tablet daily for 5 days.");

        petService.create(new PetRequest("Pancake", Species.OTHER, "Axolotl", null, today.minusYears(1),
                "Lives in a 20 gallon tank. Keep the water cool."));

        log.info("Loaded demo data: 3 pets, 8 records");
    }

    private void record(PetResponse pet, RecordType type, String title, LocalDate date, String provider,
            String notes) {
        recordService.create(pet.id(), new RecordRequest(type, title, date, provider, notes));
    }
}
