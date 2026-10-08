package com.novellia.pets.steps;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.novellia.pets.common.ApiValidationException;
import com.novellia.pets.common.NotFoundException;
import com.novellia.pets.pet.PetRequest;
import com.novellia.pets.pet.PetResponse;
import com.novellia.pets.pet.Species;
import com.novellia.pets.steps.StepsResponse.DailySteps;
import com.novellia.pets.support.Fixtures;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class StepServiceTest {
    private final Fixtures f = new Fixtures();
    private final PetResponse rex = f.petService.create(new PetRequest("Rex", Species.DOG, null, null, null, null));

    @Test
    void petWithoutATrackerIsNotTracked() {
        StepsResponse response = f.stepService.daily(rex.id(), 30);
        assertThat(response.tracked()).isFalse();
        assertThat(response.averageLast7Days()).isNull();
        assertThat(response.days()).isEmpty();
    }

    @Test
    void dailyTotalsForTheRequestedWindowWithTodayMarkedPartial() {
        for (int i = 0; i <= 40; i++) {
            day(Fixtures.TODAY.minusDays(i), 1000 + i);
        }

        StepsResponse response = f.stepService.daily(rex.id(), 30);

        assertThat(response.tracked()).isTrue();
        assertThat(response.days()).hasSize(30);
        assertThat(response.days().get(0)).isEqualTo(new DailySteps(Fixtures.TODAY.minusDays(29), 1029, false));
        assertThat(response.days().get(29)).isEqualTo(new DailySteps(Fixtures.TODAY, 1000, true));
    }

    @Test
    void sevenDayAverageLeavesOutTodayAndDaysWithoutData() {
        day(Fixtures.TODAY, 50);                // partial today, ignored
        day(Fixtures.TODAY.minusDays(1), 1000);
        day(Fixtures.TODAY.minusDays(2), 2001);
        day(Fixtures.TODAY.minusDays(7), 3000);
        day(Fixtures.TODAY.minusDays(8), 99_999); // outside the week

        assertThat(f.stepService.daily(rex.id(), 1).averageLast7Days()).isEqualTo(2000);
    }

    @Test
    void averageIsNullWhenTheLastWeekHasNoData() {
        day(Fixtures.TODAY.minusDays(30), 5000);
        assertThat(f.stepService.daily(rex.id(), 30).averageLast7Days()).isNull();
    }

    @Test
    void rejectsUnknownPetsAndOutOfRangeWindows() {
        assertThatThrownBy(() -> f.stepService.daily(UUID.randomUUID(), 30)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> f.stepService.daily(rex.id(), 0)).isInstanceOf(ApiValidationException.class);
        assertThatThrownBy(() -> f.stepService.daily(rex.id(), 367)).isInstanceOf(ApiValidationException.class);
    }

    /** Saves a day whose slots add up to {@code total}. */
    private void day(LocalDate date, int total) {
        int[] slots = new int[StepRepository.SLOTS_PER_DAY];
        slots[0] = total;
        f.steps.saveDay(rex.id(), date, slots);
    }
}
