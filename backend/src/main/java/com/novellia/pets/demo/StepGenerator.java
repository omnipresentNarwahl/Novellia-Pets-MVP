package com.novellia.pets.demo;

import static com.novellia.pets.steps.StepRepository.SLOTS_PER_DAY;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.NavigableMap;
import java.util.Random;
import java.util.TreeMap;

/**
 * Makes up a year of plausible ten-minute step counts for a demo pet. The same seed and {@code now} always
 * give the same data.
 *
 * <p>Each day gets a total (the profile's typical day, adjusted for weekends, the season, random variation
 * and the odd lazy day), which is then spread over the day's slots following the profile's daily rhythm.
 */
public final class StepGenerator {

    /** Activity pattern for a kind of pet. Times are hours of the day. */
    public enum Profile {
        /** Walks around 07:00, 12:30 and 18:00, light movement in between, asleep overnight. */
        DOG(12_000, 1.2, new double[][] {{7.0, 0.35, 6}, {12.5, 0.3, 3}, {18.0, 0.4, 6}}),
        /** Most active around dawn and dusk, naps through the day, short bursts at night. */
        CAT(3_000, 1.0, new double[][] {{6.0, 0.6, 3}, {19.5, 0.7, 3}});

        private final int typicalDay;
        private final double weekendFactor;
        /** Peaks as {hour, width in hours, height relative to the background level}. */
        private final double[][] peaks;

        Profile(int typicalDay, double weekendFactor, double[][] peaks) {
            this.typicalDay = typicalDay;
            this.weekendFactor = weekendFactor;
            this.peaks = peaks;
        }

        /** Background activity outside the peaks. */
        private double background(double hour) {
            return switch (this) {
                case DOG -> hour < 6 || hour >= 22 ? 0.02 : 0.3;
                case CAT -> hour >= 10 && hour < 16 ? 0.08 : hour >= 17 && hour < 23 ? 0.25 : 0.15;
            };
        }
    }

    /** A spell of reduced activity, such as an injury: {@code depth} lower for a while, then recovering. */
    public record Dip(LocalDate start, int lowDays, int recoveryDays, double depth) {
        double factor(LocalDate date) {
            long day = ChronoUnit.DAYS.between(start, date);
            if (day < 0) {
                return 1;
            }
            if (day < lowDays) {
                return 1 - depth;
            }
            long intoRecovery = day - lowDays;
            if (intoRecovery < recoveryDays) {
                return 1 - depth * (1 - (intoRecovery + 1.0) / (recoveryDays + 1));
            }
            return 1;
        }
    }

    private static final double LAZY_DAY_CHANCE = 0.05;
    private static final double LAZY_DAY_FACTOR = 0.45;

    private StepGenerator() {
    }

    /**
     * One year of days ending today. Today is filled only up to and including the slot that {@code now} falls
     * in; later slots are zero.
     */
    public static NavigableMap<LocalDate, int[]> generate(Profile profile, long seed, LocalDateTime now,
            List<Dip> dips) {
        Random random = new Random(seed);
        LocalDate today = now.toLocalDate();
        NavigableMap<LocalDate, int[]> days = new TreeMap<>();
        for (LocalDate date = today.minusYears(1); !date.isAfter(today); date = date.plusDays(1)) {
            int total = (int) Math.round(dailyTotal(profile, date, random, dips));
            days.put(date, spread(profile, total, random));
        }
        int currentSlot = now.getHour() * 6 + now.getMinute() / 10;
        int[] todaySlots = days.get(today);
        for (int i = currentSlot + 1; i < SLOTS_PER_DAY; i++) {
            todaySlots[i] = 0;
        }
        return days;
    }

    private static double dailyTotal(Profile profile, LocalDate date, Random random, List<Dip> dips) {
        boolean weekend = date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY;
        double total = profile.typicalDay
                * (weekend ? profile.weekendFactor : 1)
                * season(profile, date)
                * (1 + random.nextGaussian() * 0.12);
        if (random.nextDouble() < LAZY_DAY_CHANCE) {
            total *= LAZY_DAY_FACTOR;
        }
        for (Dip dip : dips) {
            total *= dip.factor(date);
        }
        return Math.max(0, total);
    }

    /** A little lower in winter, and for the dog a dip in the midsummer heat. */
    private static double season(Profile profile, LocalDate date) {
        double dayOfYear = date.getDayOfYear();
        double seasonal = 1 + 0.1 * Math.cos(2 * Math.PI * (dayOfYear - 180) / 365.0);
        if (profile == Profile.DOG) {
            seasonal -= 0.15 * Math.exp(-Math.pow((dayOfYear - 205) / 15.0, 2));
        }
        return seasonal;
    }

    /** Splits {@code total} across the day's slots so that they add up to exactly {@code total}. */
    private static int[] spread(Profile profile, int total, Random random) {
        double[] weights = new double[SLOTS_PER_DAY];
        // Routines drift a little from day to day.
        double[] shifts = new double[profile.peaks.length];
        for (int p = 0; p < shifts.length; p++) {
            shifts[p] = random.nextGaussian() * 0.3;
        }
        double sum = 0;
        for (int i = 0; i < SLOTS_PER_DAY; i++) {
            double hour = (i + 0.5) / 6;
            double weight = profile.background(hour);
            for (int p = 0; p < profile.peaks.length; p++) {
                double[] peak = profile.peaks[p];
                weight += peak[2] * Math.exp(-0.5 * Math.pow((hour - peak[0] - shifts[p]) / peak[1], 2));
            }
            if (profile == Profile.CAT && hour < 5 && random.nextDouble() < 0.06) {
                weight *= 4; // the 3am zoomies
            }
            weights[i] = weight * Math.exp(random.nextGaussian() * 0.35);
            sum += weights[i];
        }

        // Largest-remainder rounding keeps the slots summing to the day's total.
        int[] slots = new int[SLOTS_PER_DAY];
        double[] remainders = new double[SLOTS_PER_DAY];
        int assigned = 0;
        for (int i = 0; i < SLOTS_PER_DAY; i++) {
            double exact = total * weights[i] / sum;
            slots[i] = (int) exact;
            remainders[i] = exact - slots[i];
            assigned += slots[i];
        }
        for (int left = total - assigned; left > 0; left--) {
            int best = 0;
            for (int i = 1; i < SLOTS_PER_DAY; i++) {
                if (remainders[i] > remainders[best]) {
                    best = i;
                }
            }
            slots[best]++;
            remainders[best] = -1;
        }
        return slots;
    }
}
