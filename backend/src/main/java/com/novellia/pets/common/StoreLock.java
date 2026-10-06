package com.novellia.pets.common;

import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Supplier;

/**
 * One read-write lock for the whole in-memory store. Operations that touch both repositories,
 * or read then write based on what they read, run inside a short critical section.
 */
public class StoreLock {
    private final ReentrantReadWriteLock lock = new ReentrantReadWriteLock();

    public <T> T read(Supplier<T> action) {
        lock.readLock().lock();
        try {
            return action.get();
        } finally {
            lock.readLock().unlock();
        }
    }

    public <T> T write(Supplier<T> action) {
        lock.writeLock().lock();
        try {
            return action.get();
        } finally {
            lock.writeLock().unlock();
        }
    }

    public void write(Runnable action) {
        write(() -> {
            action.run();
            return null;
        });
    }
}
