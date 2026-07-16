/**
 * SYNOPSIS: services/lifeos-habit-tracker.js
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

let habits = {};

export function trackHabit(userId, habitName) {
    if (!habits[userId]) {
        habits[userId] = {};
    }
    if (!habits[userId][habitName]) {
        habits[userId][habitName] = { streak: 0, lastTracked: null };
    }
    const habit = habits[userId][habitName];
    const today = new Date().toISOString().split('T')[0];

    if (habit.lastTracked !== today) {
        habit.streak += 1;
        habit.lastTracked = today;
    }
    return habit.streak;
}

export function recoverStreak(userId, habitName) {
    if (!habits[userId] || !habits[userId][habitName]) {
        return 0;
    }
    const habit = habits[userId][habitName];
    const today = new Date();
    const lastTracked = new Date(habit.lastTracked);
    const differenceInDays = Math.floor((today - lastTracked) / (1000 * 60 * 60 * 24));

    if (differenceInDays > 1) {
        habit.streak = 0; // Reset streak if more than a day has passed since last tracking
    }
    return habit.streak;
}

export { habits };
