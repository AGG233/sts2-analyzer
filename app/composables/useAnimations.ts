import { usePreferredReducedMotion } from "@vueuse/core";

export function useAnimations() {
	const prefersReducedMotion = usePreferredReducedMotion();

	// Micro-interaction presets
	const hoverScale = computed(() => {
		if (prefersReducedMotion.value) return {};
		return { scale: 1.02, transition: { duration: 200 } };
	});

	const tapScale = computed(() => {
		if (prefersReducedMotion.value) return {};
		return { scale: 0.98, transition: { duration: 100 } };
	});

	// Page transition presets
	const pageTransition = computed(() => {
		if (prefersReducedMotion.value) {
			return { name: "fade", mode: "out-in" };
		}
		return { name: "slide-fade", mode: "out-in" };
	});

	// List transition presets
	const listTransition = computed(() => {
		if (prefersReducedMotion.value) {
			return { name: "list" };
		}
		return { name: "list-stagger" };
	});

	return {
		prefersReducedMotion,
		hoverScale,
		tapScale,
		pageTransition,
		listTransition,
	};
}
