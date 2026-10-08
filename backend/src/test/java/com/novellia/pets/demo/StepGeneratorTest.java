package com.novellia.pets.demo;

import static com.novellia.pets.steps.StepRepository.SLOTS_PER_DAY;
import static org.assertj.core.api.Assertions.assertThat;

import com.novellia.pets.demo.StepGenerator.Dip;
import com.novellia.pets.demo.StepGenerator.Profile;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.NavigableMap;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class StepGeneratorTest {
    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 6, 14, 35);
    private static final LocalDate TODAY = NOW.toLocalDate();

    @Test
    void coversAYearEndingTodayAndIsTheSameForTheSameSeed() {
        NavigableMap<LocalDate, int[]> a = StepGenerator.generate(Profile.DOG, 42, NOW, List.of());
        NavigableMap<LocalDate, int[]> b = StepGenerator.generate(Profile.DOG, 42, NOW, List.of());

        assertThat(a.firstKey()).isEqualTo(TODAY.minusYears(1));
        assertThat(a.lastKey()).isEqualTo(TODAY);
        assertThat(a.values()).allSatisfy(slots -> assertThat(slots).hasSize(SLOTS_PER_DAY));
        assertThat(a.keySet()).containsExactlyElementsOf(b.keySet());
        a.forEach((date, slots) -> assertThat(slots).containsExactly(b.get(date)));
    }

    @Test
    void dogDaysAreRealisticWithQuietNightsAndWalkPeaks() {
        NavigableMap<LocalDate, int[]> days = StepGenerator.generate(Profile.DOG, 1, NOW, List.of());
        long[] totals = days.headMap(TODAY).values().stream().mapToLong(StepGeneratorTest::total).sorted().toArray();

        assertThat(totals[totals.length / 2]).isBetween(9_000L, 15_000L);
        assertThat(totals[0]).isPositive();
        assertThat(totals[totals.length - 1]).isLessThan(25_000L);

        int[] average = averageSlots(days.headMap(TODAY));
        int night = IntStream.range(0, 30).map(i -> average[i]).max().orElseThrow();      // 00:00-05:00
        int morningWalk = IntStream.range(40, 46).map(i -> average[i]).max().orElseThrow(); // 06:40-07:40
        assertThat(night).isLessThan(20);
        assertThat(morningWalk).isGreaterThan(300);
    }

    @Test
    void catsAreLessActiveThanDogs() {
        long cat = StepGenerator.generate(Profile.CAT, 1, NOW, List.of()).headMap(TODAY).values().stream()
                .mapToLong(StepGeneratorTest::total).sum();
        long dog = StepGenerator.generate(Profile.DOG, 1, NOW, List.of()).headMap(TODAY).values().stream()
                .mapToLong(StepGeneratorTest::total).sum();
        assertThat(cat * 2).isLessThan(dog);
    }

    @Test
    void todayStopsAtTheCurrentSlot() {
        int[] today = StepGenerator.generate(Profile.DOG, 1, NOW, List.of()).get(TODAY);
        int currentSlot = 14 * 6 + 3; // 14:30-14:40
        assertThat(Arrays.stream(today, currentSlot + 1, SLOTS_PER_DAY).sum()).isZero();
        assertThat(Arrays.stream(today, 0, currentSlot + 1).sum()).isPositive();
    }

    @Test
    void aDipLowersActivityAndThenRecovers() {
        LocalDate start = TODAY.minusDays(20);
        Dip dip = new Dip(start, 5, 7, 0.6);
        NavigableMap<LocalDate, int[]> with = StepGenerator.generate(Profile.CAT, 7, NOW, List.of(dip));
        NavigableMap<LocalDate, int[]> without = StepGenerator.generate(Profile.CAT, 7, NOW, List.of());

        long low = sum(with, start, start.plusDays(4));
        long normal = sum(without, start, start.plusDays(4));
        assertThat((double) low / normal).isBetween(0.3, 0.5);
        assertThat(sum(with, start.minusDays(5), start.minusDays(1)))
                .isEqualTo(sum(without, start.minusDays(5), start.minusDays(1)));
        assertThat(dip.factor(start.plusDays(5))).isGreaterThan(dip.factor(start.plusDays(4)));
        assertThat(dip.factor(start.plusDays(12))).isEqualTo(1);
    }

    private static long total(int[] slots) {
        return Arrays.stream(slots).sum();
    }

    private static long sum(NavigableMap<LocalDate, int[]> days, LocalDate from, LocalDate to) {
        return days.subMap(from, true, to, true).values().stream().mapToLong(StepGeneratorTest::total).sum();
    }

    private static int[] averageSlots(Map<LocalDate, int[]> days) {
        int[] average = new int[SLOTS_PER_DAY];
        for (int i = 0; i < SLOTS_PER_DAY; i++) {
            final int slot = i;
            average[i] = (int) days.values().stream().mapToInt(s -> s[slot]).average().orElse(0);
        }
        return average;
    }
}
