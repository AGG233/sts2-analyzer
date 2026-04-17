export function findNearestScrollable(el: HTMLElement): HTMLElement | null {
	let current: HTMLElement | null = el;
	while (current) {
		const style = getComputedStyle(current);
		const overflowY = style.overflowY;
		if (
			(overflowY === "auto" || overflowY === "scroll") &&
			current.scrollHeight > current.clientHeight
		) {
			return current;
		}
		current = current.parentElement;
	}
	return null;
}

export function canScroll(el: HTMLElement, direction: "up" | "down"): boolean {
	if (direction === "up") {
		return el.scrollTop > 0;
	}
	return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
}

export interface MapInstance {
	getAllFloorsSorted: () => number[];
}

export function handleMainWheel(
	event: WheelEvent,
	mapRef: MapInstance | null,
	selectedFloor: number | undefined,
	onSelectFloor: (floor: number) => void,
) {
	const target = event.target as HTMLElement;
	const direction = event.deltaY > 0 ? "down" : "up";

	// Check if mouse is over a scrollable container
	const scrollable = findNearestScrollable(target);
	if (scrollable && canScroll(scrollable, direction)) {
		return;
	}

	// No scrollable container or at boundary → floor selection
	event.preventDefault();
	if (!mapRef) return;

	const floors = mapRef.getAllFloorsSorted();
	if (floors.length === 0) return;

	const firstFloor = floors[0];
	if (firstFloor === undefined) return;
	const current = selectedFloor ?? firstFloor;
	const currentIndex = floors.indexOf(current);
	if (currentIndex === -1) return;

	const step = event.deltaY > 0 ? 1 : -1;
	const newIndex = Math.max(
		0,
		Math.min(floors.length - 1, currentIndex + step),
	);
	if (newIndex !== currentIndex) {
		const nextFloor = floors[newIndex];
		if (nextFloor !== undefined) {
			onSelectFloor(nextFloor);
		}
	}
}
