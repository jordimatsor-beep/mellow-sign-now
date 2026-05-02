/**
 * Utility for playing a notification sound without needing external assets.
 * Uses the Web Audio API to generate a soft, pleasant "ding".
 */
export function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const context = new AudioContext();
        
        // Prevent issues with suspended audio context (browser auto-play policies)
        if (context.state === 'suspended') {
            context.resume();
        }

        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        // 'sine' wave gives a smooth, clean tone
        oscillator.type = 'sine';

        // Envelope: Quick attack, smooth decay
        gainNode.gain.setValueAtTime(0, context.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.03); // Quick fade in
        gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.5); // Slow fade out

        // Pitch: Start high, drop slightly (creates a "ding" or droplet effect)
        oscillator.frequency.setValueAtTime(1046.50, context.currentTime); // C6
        oscillator.frequency.exponentialRampToValueAtTime(1318.51, context.currentTime + 0.05); // E6

        // Play for 0.5 seconds
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.5);
    } catch (e) {
        console.warn("Audio playback failed:", e);
    }
}
