/**
 * ResonanceInsights.ts
 * 
 * This utility provides "Intelligence" to the Resonance Lab by mapping
 * detected frequency ranges to scientific facts and physical properties.
 */

export interface ResonanceFact {
    min: number;
    max: number;
    title: string;
    description: string;
    warning?: string;
}

export const PHYSICAL_INSIGHTS: ResonanceFact[] = [
    {
        min: 1,
        max: 20,
        title: "Infrasonic Modes",
        description: "These are 'felt' rather than heard. You are likely detecting structural vibrations or heavy engine hums.",
        warning: "Extreme volumes at these frequencies can cause structural fatigue over time."
    },
    {
        min: 20,
        max: 60,
        title: "Sub-Bass Body",
        description: "Resonant modes for large furniture, empty cabinets, or room corners.",
    },
    {
        min: 100,
        max: 250,
        title: "Structural Rigidity",
        description: "Common resonance for wooden beams, plastic shells, and thick metal plates.",
    },
    {
        min: 400,
        max: 1200,
        title: "Glass & Ceramics",
        description: "The 'Singing' range. Most wine glasses and ceramic bowls resonate here.",
        warning: "Mirroring at precise resonance with high gain can shatter glass!"
    },
    {
        min: 2000,
        max: 5000,
        title: "High Transients",
        description: "Small metallic objects like keys, coins, or thin metal pipes have peaks here.",
    }
];

/**
 * Gets the most relevant insight for a given frequency.
 */
export function getResonanceInsight ( freq: number ): ResonanceFact | null {
    if ( freq <= 0 ) return null;
    return PHYSICAL_INSIGHTS.find( f => freq >= f.min && freq <= f.max ) || null;
}

