import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { StorageService } from '@spectralsuite/core';

/**
 * Manages the progress state of the Spectral Academy.
 * We need a central store so that the Map, the LessonRunner, and the Dashboard
 * all have a single source of truth for what a student has completed.
 */
export const useAcademyStore = defineStore('academy', () => {
    // Array of lesson IDs that the user has successfully finished
    // We load immediate from StorageService to prevent empty state flashes
    const saved = StorageService.getJSON<string[]>('ACADEMY_COMPLETED');
    const completedLessons = ref<string[]>(Array.isArray(saved) ? saved : []);

    /**
     * Automatically saves the progress to localStorage whenever it changes.
     * The `deep: true` makes sure we catch array mutations.
     */
    watch(
        completedLessons,
        (newVal) => {
            StorageService.setJSON('ACADEMY_COMPLETED', newVal);
        },
        { deep: true }
    );

    /**
     * Marks a lesson as completely finished.
     * 
     * @param lessonId - The unique string ID of the lesson
     */
    function completeLesson(lessonId: string) {
        if (!completedLessons.value.includes(lessonId)) {
            completedLessons.value.push(lessonId);
        }
    }

    /**
     * Checks if a lesson has been finished.
     * 
     * @param lessonId - The unique string ID of the lesson 
     * @returns boolean - True if the lesson is in the completed list
     */
    function isCompleted(lessonId: string): boolean {
        return completedLessons.value.includes(lessonId);
    }

    /**
     * Checks if a lesson is available to play.
     * A lesson is locked if ANY of its prerequisites have not been completed.
     * 
     * @param prerequisites - An array of lesson IDs that must be finished first
     * @returns boolean - True if all prerequisites are met
     */
    function isUnlocked(prerequisites?: string[]): boolean {
        // If there are no prerequisites, it's immediately unlocked
        if (!prerequisites || prerequisites.length === 0) {
            return true;
        }
        
        // Return true only if EVERY required lesson is in our completed list
        return prerequisites.every(reqId => completedLessons.value.includes(reqId));
    }

    return {
        completedLessons,
        completeLesson,
        isCompleted,
        isUnlocked
    };
});
